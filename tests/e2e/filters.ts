import type { Page } from '@playwright/test';

export async function chooseFilter(page: Page, label: string, value: string) {
  const group = page.getByRole('group', { name: label, exact: true });
  if (label === '细分考点' || label === 'Subtopic') {
    await group.getByRole('combobox').fill(value);
    await group.getByRole('option', { name: value, exact: true }).click();
  } else {
    await group.getByRole('button', { name: value, exact: true }).click();
  }
}
