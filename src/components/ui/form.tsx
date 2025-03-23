import { forwardRef, createContext, useContext, useId } from "react";
import { cn } from "../../lib/utils";

// Using type instead of interface to avoid eslint warning
type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn("space-y-6", className)}
        {...props}
      />
    );
  }
);
Form.displayName = "Form";

interface FormItemContextValue {
  id: string;
}

const FormItemContext = createContext<FormItemContextValue>({
  id: "",
});

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
}

const FormItem = forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, id, ...props }, ref) => {
    const generatedId = useId();
    const itemId = id || generatedId;
    
    return (
      <FormItemContext.Provider value={{ id: itemId }}>
        <div
          ref={ref}
          className={cn("space-y-2", className)}
          {...props}
        />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = "FormItem";

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, children, required, ...props }, ref) => {
    const { id } = useContext(FormItemContext);
    
    return (
      <label
        ref={ref}
        htmlFor={id}
        className={cn(
          "block text-sm font-medium text-gray-700 mb-1", 
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);
FormLabel.displayName = "FormLabel";

// Using type instead of interface to avoid eslint warning
type FormControlProps = React.HTMLAttributes<HTMLDivElement>;

const FormControl = forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, ...props }, ref) => {
    const { id } = useContext(FormItemContext);
    
    return (
      <div
        ref={ref}
        id={id}
        className={cn("mt-1", className)}
        {...props}
      />
    );
  }
);
FormControl.displayName = "FormControl";

// Using type instead of interface to avoid eslint warning
type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const FormDescription = forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-gray-500 mt-1", className)}
        {...props}
      />
    );
  }
);
FormDescription.displayName = "FormDescription";

// Using type instead of interface to avoid eslint warning
type FormErrorProps = React.HTMLAttributes<HTMLParagraphElement>;

const FormError = forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;
    
    return (
      <p
        ref={ref}
        className={cn("text-sm font-medium text-red-500 mt-1", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
FormError.displayName = "FormError";

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormError,
};