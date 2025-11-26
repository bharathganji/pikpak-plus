"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasAgreed = localStorage.getItem("pikpak-plus-consent");
    if (!hasAgreed) {
      setOpen(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem("pikpak-plus-consent", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Legal Disclaimer & User Agreement</DialogTitle>
          <DialogDescription>
            Please read and accept the following terms to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto text-sm text-muted-foreground">
          <p>
            <strong>1. User Responsibility:</strong> You acknowledge that you
            are solely responsible for any content you add, upload, or share on
            this platform. PikPak Plus does not monitor or control
            user-generated content.
          </p>
          <p>
            <strong>2. No Liability:</strong> PikPak Plus and its operators are
            not liable for any damages, legal issues, or data loss resulting
            from the use of this service or the content hosted herein.
          </p>
          <p>
            <strong>3. Content Ownership:</strong> You retain ownership of your
            content but grant PikPak Plus a license to host and display it as
            part of the service.
          </p>
          <p>
            <strong>4. Indemnification:</strong> You agree to indemnify and hold
            harmless PikPak Plus from any claims arising out of your use of the
            service or violation of these terms.
          </p>
          <p>
            By clicking "I Agree", you confirm that you have read, understood,
            and accepted these terms.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleAgree} className="w-full">
            I Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
