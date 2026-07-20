import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = React.useRef<number | null>(null);
  const touchDeltaX = React.useRef<number>(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrevious, handleNext, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(dx) < 50) return;
    if (dx > 0) handlePrevious();
    else handleNext();
  };

  if (!photos.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[100vw] w-[100vw] h-[100vh] sm:max-w-[95vw] sm:h-[95vh] p-0 bg-black/95 border-none rounded-none sm:rounded-lg"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center min-h-[60vh]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Previous Button */}
          {photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Main Image */}
          <img
            src={photos[currentIndex]}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder.svg";
            }}
          />

          {/* Next Button */}
          {photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={handleNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Photo Counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoLightbox;
