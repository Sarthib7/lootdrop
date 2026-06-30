import { getDb } from "@lootdrop/db";
import { getBitrefillClient } from "@lootdrop/bitrefill";

/** Process-wide singletons shared by every handler. */
export const db = getDb();
export const bitrefill = getBitrefillClient();
