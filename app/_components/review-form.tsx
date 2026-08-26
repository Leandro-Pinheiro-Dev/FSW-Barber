"use client";

import { useState } from "react";

import { StarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/_components/ui/button";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";

import { createReview } from "@/app/_actions/create-review";

interface ReviewFormProps {
  barbershopId: string;
}

const ReviewForm = ({ barbershopId }: ReviewFormProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    try {
      setLoading(true);

      await createReview({
        barbershopId,
        rating,
        comment,
      });

      toast.success("Avaliação enviada com sucesso!");

      setRating(0);
      setComment("");
      setOpen(false);

      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a avaliação.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline">Avaliar</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar barbearia</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">
              Como foi sua experiência?
            </p>

            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <StarIcon
                    size={32}
                    className={
                      star <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Comentário</p>

            <Textarea
              placeholder="Conte como foi seu atendimento..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
