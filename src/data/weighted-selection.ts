export function weightedIndex(weights: number[], position: number): number {
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  let cursor = position % totalWeight;

  for (let index = 0; index < weights.length; index += 1) {
    if (cursor < weights[index]) {
      return index;
    }

    cursor -= weights[index];
  }

  return weights.length - 1;
}
