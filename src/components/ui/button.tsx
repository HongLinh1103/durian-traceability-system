import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "destructive";
    size?: "sm" | "default" | "lg";
    asChild?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default: "bg-brand-600 text-white hover:bg-brand-700 shadow-soft",
    outline: "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
    ghost: "text-brand-700 hover:bg-brand-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-9 px-3 text-sm",
    default: "h-12 px-4 text-sm",
    lg: "h-12 min-h-12 px-6 text-base",
};

export function Button({ className, variant = "default", size = "default", type = "button", asChild, children, ...props }: React.PropsWithChildren<ButtonProps>) {
    const classes = cn(
        "inline-flex items-center justify-center rounded-2xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
    );

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            className: cn(classes, (children.props as { className?: string }).className),
        });
    }

    return (
        <button
            type={type}
            className={classes}
            {...props}
        >
            {children}
        </button>
    );
}
