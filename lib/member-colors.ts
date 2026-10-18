import type { ProfileId } from "./collaboration/model";

// Identity-based colors stay stable when members are reordered or a group is
// smaller. Each supports white initials and a distinct swatch on ivory.
export const memberColors: Record<ProfileId, string> = {
  kevin: "#800f1a",
  maya: "#a65a6a",
  noah: "#957124",
  lily: "#75658c",
  ava: "#4e6870",
};
