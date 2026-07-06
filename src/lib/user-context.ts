import { createContext, useContext } from "react";

export interface UserContextValue {
  userEmail: string | null;
  isAdmin: boolean;
}

export const UserContext = createContext<UserContextValue>({
  userEmail: null,
  isAdmin: false,
});

export const useUser = () => useContext(UserContext);
