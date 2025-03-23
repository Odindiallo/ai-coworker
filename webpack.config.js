const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const analyze = process.env.ANALYZE === 'true';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
    chunkFilename: isProduction ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
    publicPath: '/',
    // Clean the output directory before emit
    clean: true
  },
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  module: {
    rules: [
      // Process TypeScript files
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-transform-runtime',
              isProduction && 'transform-react-remove-prop-types'
            ].filter(Boolean)
          }
        },
      },
      // Process CSS
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader'
        ],
      },
      // Process images
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            // Only images smaller than 10kb will be inlined
            maxSize: 10 * 1024,
          },
        },
        generator: {
          filename: 'static/media/[name].[hash:8][ext]'
        }
      },
      // Process SVGs
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
      },
      // Process fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/fonts/[name].[hash:8][ext]'
        }
      }
    ],
  },
  // Split chunks for better caching and mobile optimization
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            ecma: 5,
            comparisons: false,
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      // Optimize chunk sizes for mobile
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 8, // Lower for mobile to reduce connections
      maxInitialRequests: 6, // Lower for mobile first load
      automaticNameDelimiter: '~',
      cacheGroups: {
        // Extract React into a separate chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 40,
        },
        // Extract Firebase into a separate chunk
        firebase: {
          test: /[\\/]node_modules[\\/](firebase)[\\/]/,
          name: 'vendor-firebase',
          chunks: 'all',
          priority: 30,
        },
        // Bundle UI libraries together
        ui: {
          test: /[\\/]node_modules[\\/](@?tailwindcss|shadcn-ui)[\\/]/,
          name: 'vendor-ui',
          chunks: 'all',
          priority: 20,
        },
        // Bundle all other vendor code
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Extract CSS
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
        },
      },
    },
    // Keep the runtime chunk separated to enable long term caching
    runtimeChunk: 'single',
  },
  plugins: [
    // Generate HTML file
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
      minify: isProduction && {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
    // Extract CSS into separate files
    isProduction && new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
    }),
    // Generate a manifest file for the PWA
    isProduction && new WebpackManifestPlugin({
      fileName: 'asset-manifest.json',
      publicPath: '/',
      generate: (seed, files, entrypoints) => {
        const manifestFiles = files.reduce((manifest, file) => {
          manifest[file.name] = file.path;
          return manifest;
        }, seed);
        const entrypointFiles = entrypoints.main.filter(
          fileName => !fileName.endsWith('.map')
        );

        return {
          files: manifestFiles,
          entrypoints: entrypointFiles,
        };
      },
    }),
    // Generate service worker for offline support
    isProduction && new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB max per file
      // Don't precache images (they're handled separately)
      exclude: [/\.(?:png|jpg|jpeg|svg|gif)$/],
      // Define runtime caching rules
      runtimeCaching: [
        {
          // Cache images with a network-first strategy
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
            },
          },
        },
        {
          // Cache API calls with stale-while-revalidate
          urlPattern: /\/api\//,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
      ],
    }),
    // Compress assets for faster downloads on mobile
    isProduction && new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240, // Only compress files > 10kb
      minRatio: 0.8
    }),
    // Analyze bundle (only when explicitly requested)
    analyze && new BundleAnalyzerPlugin(),
  ].filter(Boolean),
  // Development server config
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    historyApiFallback: true,
    hot: true,
    port: 3000,
    compress: true,
  },
  // Performance budget warnings for mobile-friendly bundles
  performance: {
    hints: isProduction ? 'warning' : false,
    maxAssetSize: 300 * 1024, // 300kb per asset
    maxEntrypointSize: 500 * 1024, // 500kb per entry point
  },
};
