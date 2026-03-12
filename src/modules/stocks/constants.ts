export const PRODUCT_TYPE_VALUES = [
  'kutu',
  'blister_folyo',
  'sase_folyo',
  'prospektus',
  'sise',
  'etiket',
  'kapak',
  'sleeve'
] as const;

export const PRODUCT_TYPE_LABELS: Record<(typeof PRODUCT_TYPE_VALUES)[number], string> = {
  kutu: 'kutu',
  blister_folyo: 'blister folyo',
  sase_folyo: 'sase folyo',
  prospektus: 'prospektus',
  sise: 'sise',
  etiket: 'etiket',
  kapak: 'kapak',
  sleeve: 'sleeve'
};

export const PRODUCT_CATEGORY_VALUES = ['sarf', 'hammadde'] as const;

export const PRODUCT_CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORY_VALUES)[number], string> = {
  sarf: 'sarf',
  hammadde: 'hammadde'
};
