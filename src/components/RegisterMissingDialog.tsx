import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  stepTitle: string;
  items: string[];
  onClose: () => void;
}

export default function RegisterMissingDialog({ open, stepTitle, items, onClose }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-md border border-primary/40 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-4 ring-primary/20">
            <AlertCircle className="h-7 w-7 text-primary" />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            Almost there
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Please complete the following in <span className="font-semibold text-foreground">{stepTitle}</span> to continue:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="my-2 space-y-2 max-h-[45vh] overflow-y-auto">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose} className="w-full rounded-lg font-semibold">
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
