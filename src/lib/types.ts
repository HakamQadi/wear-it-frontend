export type AccountRole = 'user' | 'admin';

export type SessionUser = { id: string; name: string; email: string; role: AccountRole };
export type AuthResponse = { accessToken: string; user: SessionUser };

/** A piece of admin-managed copy, held in both interface languages. */
export type LocalisedText = { ar: string; en: string };

export type ClothingType = {
  _id: string;
  name: string;
  /** Arabic label; empty when the admin has not set one, in which case `name` is used. */
  nameAr?: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

export type WardrobeItem = {
  _id: string;
  name: string;
  typeId: Pick<ClothingType, '_id' | 'name' | 'nameAr' | 'slug' | 'isActive' | 'sortOrder'> | null;
  imageUrl: string;
  color: string;
  brand: string;
  notes: string;
  isArchived: boolean;
  createdAt: string;
};

export type UserPhoto = {
  _id: string;
  imageUrl: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
};

export type LookItem = {
  itemId: string;
  typeId: string;
  typeName: string;
  typeNameAr?: string;
  name: string;
  imageUrl: string;
};

export type Look = {
  _id: string;
  personImageUrl: string;
  items: LookItem[];
  prompt: string;
  status: 'ready' | 'failed';
  resultImageUrl: string;
  errorMessage: string;
  createdAt: string;
};

export type SiteContent = {
  brandName: LocalisedText;
  heroTitle: LocalisedText;
  heroSubtitle: LocalisedText;
  heroCta: LocalisedText;
  announcement: LocalisedText;
  footerText: LocalisedText;
};

export const CONTENT_FIELDS = [
  'brandName',
  'announcement',
  'heroTitle',
  'heroSubtitle',
  'heroCta',
  'footerText',
] as const;

export type ContentField = (typeof CONTENT_FIELDS)[number];

export type AdminStats = {
  members: number;
  types: number;
  activeTypes: number;
  items: number;
  photos: number;
  looks: number;
  readyLooks: number;
  failedLooks: number;
};

export type TypeUsage = Pick<ClothingType, '_id' | 'name' | 'nameAr' | 'slug' | 'isActive' | 'sortOrder'> & {
  itemCount: number;
};
export type MemberRow = { _id: string; name: string; email: string; createdAt: string; itemCount: number; lookCount: number };

/** The number of clothing types a single look may combine. */
export const MAX_LOOK_ITEMS = 8;
