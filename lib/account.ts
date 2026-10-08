/** Shapes shared by the account API routes and the browser. */
export type SavedAddress = {
  id: string; // "a12" for account addresses (POS id 12), "l…" for addresses kept on this phone
  label: string;
  zoneId: number | null;
  street: string;
  building: string;
  floor: string;
  landmark: string;
};

export type AccountMe = {
  name: string;
  phone: string;
  email: string;
  provider: "phone" | "google";
  addresses: SavedAddress[];
};

/** `phoneSignIn`: the WhatsApp code is available. Google shows whenever GOOGLE_CLIENT_ID is set. */
export type AccountState =
  | { signedIn: true; me: AccountMe; signInAvailable: true; phoneSignIn: boolean }
  | { signedIn: false; me: null; signInAvailable: boolean; phoneSignIn: boolean };

/** Public: the OAuth client ID of the "Continue with Google" button (empty = no button). */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const SESSION_COOKIE = "oriano_session";
