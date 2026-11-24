import { z } from "zod";

/** Request shapes shared by the app and the API. */

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
export const point = z.object({ lat, lng });
export const fix = z.object({ lat, lng, accuracy: z.number().min(0).max(10_000) });

export const spotInput = z.object({
  dogId: z.number().int().positive(),
  point,
  fix,
  note: z.string().trim().max(280).optional(),
});
export type SpotInput = z.infer<typeof spotInput>;

export const checkinInput = z.object({ dogId: z.number().int().positive(), fix });
export type CheckinInput = z.infer<typeof checkinInput>;
