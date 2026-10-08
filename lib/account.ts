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
  addresses: SavedAddress[];
};

export type AccountState =
  | { signedIn: true; me: AccountMe; signInAvailable: true }
  | { signedIn: false; me: null; signInAvailable: boolean };

export const SESSION_COOKIE = "oriano_session";
