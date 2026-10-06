export function selectChoicesWithRequired<T extends { id: string }>(choices: T[], requiredIds: string[], distractorCount: number): T[] {
  const required = new Set(requiredIds)
  const availableRequired = choices.filter((choice) => required.has(choice.id))
  const selectedIds = new Set(availableRequired.map((choice) => choice.id))
  let remaining = Math.max(0, distractorCount)
  for (const choice of choices) {
    if (remaining === 0) break
    if (selectedIds.has(choice.id)) continue
    selectedIds.add(choice.id)
    remaining -= 1
  }
  return choices.filter((choice) => selectedIds.has(choice.id))
}
