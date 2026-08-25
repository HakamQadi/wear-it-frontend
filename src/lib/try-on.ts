export const TRY_ON_PERSON_IMAGE_FIELD = 'personImage';
export const TRY_ON_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const TRY_ON_ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const TRY_ON_ACCEPT_ATTRIBUTE = TRY_ON_ACCEPTED_IMAGE_TYPES.join(',');

export type GenerateTryOnResponse = {
  imageUrl: string;
};
