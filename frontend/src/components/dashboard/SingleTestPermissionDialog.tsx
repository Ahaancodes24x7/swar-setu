import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { SINGLE_TEST_REASONS } from "@/lib/screeningBattery";
import { Lock } from "lucide-react";

interface Props {
  open: boolean;
  studentName: string;
  testLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/** Teacher permission gate for running one DSM-5 test instead of the full three-test screening. */
export function SingleTestPermissionDialog({ open, studentName, testLabel, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) { setReason(""); setNote(""); setConfirmed(false); }
  }, [open]);

  const isOther = reason === SINGLE_TEST_REASONS[SINGLE_TEST_REASONS.length - 1];
  const canConfirm = confirmed && reason !== "" && (!isOther || note.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Teacher permission: single test
          </DialogTitle>
          <DialogDescription>
            A screening normally includes all three DSM-5 tests (reading, math and writing), because these
            difficulties often occur together. Running only the <strong>{testLabel}</strong> for {studentName} needs
            your permission and a reason, which is saved with the result.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-3">
          {SINGLE_TEST_REASONS.map((r) => (
            <div key={r} className="flex items-start gap-2">
              <RadioGroupItem value={r} id={`reason-${r}`} className="mt-0.5" />
              <Label htmlFor={`reason-${r}`} className="font-normal leading-snug">{r}</Label>
            </div>
          ))}
        </RadioGroup>
        {isOther && (
          <Textarea placeholder="Reason for running a single test" value={note} onChange={(e) => setNote(e.target.value)} />
        )}
        <div className="flex items-start gap-2 rounded-md bg-muted p-3">
          <Checkbox id="teacher-permits" checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} className="mt-0.5" />
          <Label htmlFor="teacher-permits" className="font-normal leading-snug">
            I am the teacher and I permit a single-test screen for {studentName}. I understand it cannot produce the
            combined DSM-5 screening result.
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!canConfirm} onClick={() => onConfirm(isOther ? `Other: ${note.trim()}` : reason)}>
            Start single test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
