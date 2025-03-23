import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';
import { AlertCircle, RefreshCw, Sparkles, Download, Share2, Trash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '../lib/firebase';
import OptimizedImage from './ui/OptimizedImage';

interface ImageGeneratorProps {
  actorId: string;
  modelId: string;
  instanceName: string;
  onGenerationComplete?: (imageUrl: string) => void;
  className?: string;
}

/**
 * Component for generating images with a trained model
 */
const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  actorId,
  modelId,
  instanceName,
  onGenerationComplete,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(`a photo of ${instanceName} as`);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState(false);
  const [numInferenceSteps, setNumInferenceSteps] = useState(50);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState<number | null>(null);
  const [useSeed, setUseSeed] = useState(false);
  const [imageWidth, setImageWidth] = useState(512);
  const [imageHeight, setImageHeight] = useState(512);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{
    id: string;
    url: string;
    prompt: string;
    createdAt: Date;
  }>>([]);
  const [recentGenerations, setRecentGenerations] = useState<Array<{
    id: string;
    url: string;
    prompt: string;
    createdAt: Date;
  }>>([]);

  // Load recent generations
  useEffect(() => {
    const loadRecentGenerations = async () => {
      if (!user || !actorId) return;
      
      try {
        const generationsQuery = query(
          collection(firestore, 'generations'),
          where('userId', '==', user.uid),
          where('actorId', '==', actorId),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
        
        const querySnapshot = await getDocs(generationsQuery);
        const generations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          url: doc.data().imageUrl,
          prompt: doc.data().prompt,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setRecentGenerations(generations);
      } catch (error) {
        console.error('Error loading recent generations:', error);
      }
    };
    
    loadRecentGenerations();
  }, [user, actorId]);

  // Handle aspect ratio change
  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value);
    
    // Update width and height based on aspect ratio
    const [widthRatio, heightRatio] = value.split(':').map(Number);
    
    if (value === '1:1') {
      setImageWidth(512);
      setImageHeight(512);
    } else if (value === '3:4') {
      setImageWidth(384);
      setImageHeight(512);
    } else if (value === '4:3') {
      setImageWidth(512);
      setImageHeight(384);
    } else if (value === '9:16') {
      setImageWidth(288);
      setImageHeight(512);
    } else if (value === '16:9') {
      setImageWidth(512);
      setImageHeight(288);
    }
  };

  // Generate random seed
  const generateRandomSeed = () => {
    return Math.floor(Math.random() * 1000000000);
  };

  // Generate image
  const handleGenerateImage = async () => {
    if (!user || !modelId || !prompt.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a prompt for image generation.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Prepare seed value
      const seedValue = useSeed ? seed || generateRandomSeed() : null;
      
      // Call Firebase Function to generate image
      const generateImage = httpsCallable(functions, 'generateImage');
      const result = await generateImage({
        modelId,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        width: imageWidth,
        height: imageHeight,
        numInferenceSteps,
        guidanceScale,
        seed: seedValue
      });
      
      // @ts-ignore - result.data has the structure we expect
      const { success, imageUrl, generationId } = result.data;
      
      if (success && imageUrl) {
        // Add to generated images
        const newImage = {
          id: generationId,
          url: imageUrl,
          prompt: prompt.trim(),
          createdAt: new Date()
        };
        
        setGeneratedImages(prev => [newImage, ...prev]);
        
        // Save to Firestore
        await addDoc(collection(firestore, 'generations'), {
          userId: user.uid,
          actorId,
          modelId,
          imageUrl,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim(),
          width: imageWidth,
          height: imageHeight,
          numInferenceSteps,
          guidanceScale,
          seed: seedValue,
          createdAt: serverTimestamp()
        });
        
        // Show success toast
        toast({
          title: 'Image Generated',
          description: 'Your image has been successfully generated.',
          variant: 'default'
        });
        
        // If we used a seed, save it
        if (seedValue && !useSeed) {
          setSeed(seedValue);
          setUseSeed(true);
        }
        
        // Call the onGenerationComplete callback
        if (onGenerationComplete) {
          onGenerationComplete(imageUrl);
        }
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      
      toast({
        title: 'Generation Failed',
        description: error.message || 'There was an error generating the image.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Download image
  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${instanceName}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share image
  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AI Generated Image of ${instanceName}`,
          text: `Check out this AI-generated image of ${instanceName}!`,
          url
        });
      } catch (error) {
        console.error('Error sharing image:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link Copied',
        description: 'Image URL copied to clipboard.',
        variant: 'default'
      });
    }
  };

  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Images</CardTitle>
          <CardDescription>
            Create AI-generated images of {instanceName} in various scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`a photo of ${instanceName} as a superhero`}
              className="min-h-[100px]"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500">
              Start with "a photo of {instanceName} as" and describe the scene, style, or character
            </p>
          </div>
          
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="advanced-settings">Advanced Settings</Label>
              <Switch
                id="advanced-settings"
                checked={advancedSettings}
                onCheckedChange={setAdvancedSettings}
                disabled={isGenerating}
              />
            </div>
          </div>
          
          {advancedSettings && (
            <div className="space-y-4 pt-2">
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="negative-prompt">Negative Prompt</Label>
                <Textarea
                  id="negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Things you don't want in the image"
                  className="min-h-[60px]"
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500">
                  Describe elements you want to avoid in the generated image
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                  <Select
                    value={aspectRatio}
                    onValueChange={handleAspectRatioChange}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="aspect-ratio">
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">Square (1:1)</SelectItem>
                      <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                      <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                      <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                      <SelectItem value="16:9">Horizontal (16:9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-seed">Use Seed</Label>
                    <Switch
                      id="use-seed"
                      checked={useSeed}
                      onCheckedChange={setUseSeed}
                      disabled={isGenerating}
                    />
                  </div>
                  {useSeed && (
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={seed !== null ? seed : ''}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Random seed"
                        disabled={isGenerating}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSeed(generateRandomSeed())}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="inference-steps">Quality Steps: {numInferenceSteps}</Label>
                  <span className="text-sm text-gray-500">
                    {numInferenceSteps < 30 ? 'Fast' : numInferenceSteps > 70 ? 'High Quality' : 'Balanced'}
                  </span>
                </div>
                <Slider
                  id="inference-steps"
                  min={20}
                  max={100}
                  step={5}
                  value={[numInferenceSteps]}
                  onValueChange={(value) => setNumInferenceSteps(value[0])}
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500">
                  More steps improve image quality but take longer to generate
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="guidance-scale">Prompt Strength: {guidanceScale.toFixed(1)}</Label>
                  <span className="text-sm text-gray-500">
                    {guidanceScale < 5 ? 'Subtle' : guidanceScale > 10 ? 'Strong' : 'Balanced'}
                  </span>
                </div>
                <Slider
                  id="guidance-scale"
                  min={1}
                  max={15}
                  step={0.5}
                  value={[guidanceScale]}
                  onValueChange={(value) => setGuidanceScale(value[0])}
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500">
                  Higher values follow the prompt more strictly
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleGenerateImage} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Generated Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedImages.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="relative aspect-square">
                  <OptimizedImage
                    src={image.url}
                    alt={image.prompt}
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <p className="text-sm line-clamp-2">
                    {image.prompt}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(image.createdAt).toLocaleString()}
                  </div>
                </CardContent>
                <CardFooter className="p-2 flex justify-end">
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownload(image.url)}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleShare(image.url)}
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="sr-only">Share</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Generations */}
      {recentGenerations.length > 0 && generatedImages.length === 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Recent Generations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentGenerations.map((image) => (
              <div key={image.id} className="relative rounded-md overflow-hidden">
                <div className="aspect-square">
                  <OptimizedImage
                    src={image.url}
                    alt={image.prompt}
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end">
                  <div className="p-2 text-white">
                    <p className="text-xs line-clamp-2">
                      {image.prompt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {generatedImages.length === 0 && recentGenerations.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-300 rounded-lg">
          <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No images yet</h3>
          <p className="text-sm text-center text-gray-500 mb-4">
            Generate your first image using the form above.
          </p>
          <p className="text-xs text-center text-gray-400 max-w-xs">
            Tip: Try prompts like "a photo of {instanceName} as a superhero" or "a photo of {instanceName} in Paris"
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
