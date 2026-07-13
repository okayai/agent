import { cn } from '@/lib/utils';

interface KeyboardHintProps {
  keys: string[];
  label?: string;
  className?: string;
}

export const KeyboardHint = ({ keys, label, className }: KeyboardHintProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="keyboard-key">{key}</kbd>
            {index < keys.length - 1 && <span className="text-muted-foreground mx-1">+</span>}
          </span>
        ))}
      </div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
};
