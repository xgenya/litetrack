export const STACK_SIZE = 64;
export const BOX_CAPACITY = STACK_SIZE * 27; // 1728
export const TWO_THIRDS_BOX = 18 * STACK_SIZE; // 1152 (18 stacks)

export function getRequiredDisplay(count: number): { value: number; unit: "box" | "stack" } {
  if (count >= BOX_CAPACITY) {
    return { value: Math.ceil(count / BOX_CAPACITY), unit: "box" };
  } else if (count > TWO_THIRDS_BOX) {
    return { value: 1, unit: "box" };
  } else if (count > STACK_SIZE) {
    return { value: Math.ceil(count / STACK_SIZE) + 1, unit: "stack" };
  } else {
    return { value: 1, unit: "stack" };
  }
}
