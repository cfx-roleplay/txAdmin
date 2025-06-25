import { cn } from "@/lib/utils";
import { Switch } from "./ui/switch";
import { cva, VariantProps } from "class-variance-authority";
import { forwardRef } from 'react';

const switchVariants = cva(
    'peer',
    {
        variants: {
            variant: {
                default: "",
                checkedGreen: "data-[state=unchecked]:bg-input data-[state=checked]:bg-accent",
                checkedYellow: "data-[state=unchecked]:bg-input data-[state=checked]:bg-accent",
                checkedRed: "data-[state=unchecked]:bg-input data-[state=checked]:bg-accent",
                uncheckedGreen: "data-[state=unchecked]:bg-accent data-[state=checked]:bg-input",
                uncheckedYellow: "data-[state=unchecked]:bg-accent data-[state=checked]:bg-input",
                uncheckedRed: "data-[state=unchecked]:bg-accent data-[state=checked]:bg-input",
                redGreen: "data-[state=unchecked]:bg-accent data-[state=checked]:bg-accent",
                greenRed: "data-[state=unchecked]:bg-accent data-[state=checked]:bg-accent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);


type SwitchTextProps = Omit<Parameters<typeof Switch>[0], 'children'> & {
    checkedLabel: string;
    uncheckedLabel: string;
    className?: string;
    variant?: VariantProps<typeof switchVariants>['variant'];
};

const SwitchText = forwardRef<
    React.ElementRef<typeof Switch>,
    SwitchTextProps
>(({
    id,
    checkedLabel,
    uncheckedLabel,
    variant,
    className,
    ...props
}, ref) => {
    return (
        <div className="flex items-center space-x-2">
            <Switch
                id={id}
                className={cn(
                    className,
                    switchVariants({ variant })
                )}
                ref={ref}
                {...props}
            />
            <div className="text-sm font-medium leading-none tracking-wide text-muted-foreground select-none hidden peer-data-[state=checked]:inline">
                {checkedLabel}
            </div>
            <div className="text-sm font-medium leading-none tracking-wide text-muted-foreground select-none hidden peer-data-[state=unchecked]:inline">
                {uncheckedLabel}
            </div>
        </div>
    )
});

SwitchText.displayName = 'SwitchText';

export default SwitchText;
