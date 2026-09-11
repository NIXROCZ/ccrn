export type SupportLine = { name: string; detail: string; number: string };

export const supportLines: SupportLine[] = [
  { name: 'Emergency', detail: 'If a child is in immediate danger.', number: '000' },
  { name: 'Kids Helpline', detail: 'Free counselling for young people aged 5 to 25, any hour.', number: '1800 55 1800' },
  { name: '1800RESPECT', detail: 'Sexual assault, domestic and family violence counselling.', number: '1800 737 732' },
  { name: 'Parentline NSW', detail: 'Support for parents and carers in New South Wales.', number: '1300 1300 52' },
];

export const telHref = (number: string) => `tel:${number.replace(/\s/g, '')}`;
