import { ANIMAL_GLYPH_INNER } from "@/lib/chinese/animal-glyphs";
import { cn } from "@/lib/utils";

/**
 * One of the twelve animals as Ulune draws it (languages plan, part 9), in
 * the current colour. In a page it is a box of `size` pixels; inside another
 * SVG (the animal wheel), `x` and `y` place it in that drawing's units.
 */
export function AnimalGlyph({ animal, size = 20, x, y, className }: { animal: number; size?: number; x?: number | string; y?: number | string; className?: string }) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      overflow="visible"
      className={cn("ulune-animal-glyph", className)}
      data-animal-glyph={animal}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ANIMAL_GLYPH_INNER[((animal % 12) + 12) % 12]! }}
    />
  );
}
