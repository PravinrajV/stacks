/**
 * Compute fit and centering parameters for a card.
 *
 * Given a container size and a fixed card logical size (512×342),
 * calculate the scale factor that fits the card while preserving aspect ratio,
 * and the left/top offsets to centre it.
 *
 * Note: Scale can be >1 if the container is larger than the card (upscaling),
 * as long as it still fits within the container boundaries.
 */

const CARD_LOGICAL_WIDTH = 512
const CARD_LOGICAL_HEIGHT = 342

export interface FitParams {
  scale: number
  left: number
  top: number
}

/**
 * Compute fit and centre parameters for card in container.
 *
 * @param containerWidth - Available container width in pixels
 * @param containerHeight - Available container height in pixels
 * @returns {scale, left, top} - Scale factor, left and top offsets to centre the scaled card
 */
export function computeFit(containerWidth: number, containerHeight: number): FitParams {
  // Calculate scale to fit card while preserving aspect ratio
  const scaleX = containerWidth / CARD_LOGICAL_WIDTH
  const scaleY = containerHeight / CARD_LOGICAL_HEIGHT

  // Use smaller scale to ensure fit (may be >1 or <1 depending on container)
  const scale = Math.min(scaleX, scaleY)

  // Compute scaled dimensions
  const scaledWidth = CARD_LOGICAL_WIDTH * scale
  const scaledHeight = CARD_LOGICAL_HEIGHT * scale

  // Compute offsets to centre the scaled card
  const left = (containerWidth - scaledWidth) / 2
  const top = (containerHeight - scaledHeight) / 2

  return { scale, left, top }
}
