import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define show note schema
export const showNotes = pgTable("show_notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  timestamp: text("timestamp"),
  episodeId: integer("episode_id").notNull(),
});

// Define episode schema
export const episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  guid: text("guid").notNull().unique(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  audioUrl: text("audio_url"),
  publicationDate: timestamp("publication_date").notNull(),
  duration: text("duration"),
  url: text("url").notNull(),
  tags: json("tags").notNull().$type<string[]>(),
});

// Define search results type
export const searchResultSchema = z.object({
  episode: z.object({
    id: z.number(),
    guid: z.string(),
    number: z.string(),
    title: z.string(),
    description: z.string().optional(),
    audioUrl: z.string().optional(),
    publicationDate: z.date(),
    duration: z.string().optional(),
    url: z.string(),
    tags: z.array(z.string()),
  }),
  showNotes: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      content: z.string().optional(),
      timestamp: z.string().optional(),
      episodeId: z.number(),
      matched: z.boolean().optional() // 検索にマッチしたかどうか
    })
  ),
  highlighted: z.union([
    z.boolean().optional(),
    z.object({
      episodeTitle: z.boolean().optional(),
      query: z.string().optional()
    }).optional()
  ]),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
export type Episode = typeof episodes.$inferSelect;
export type ShowNote = typeof showNotes.$inferSelect;

export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertShowNoteSchema = createInsertSchema(showNotes).omit({ id: true });

export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type InsertShowNote = z.infer<typeof insertShowNoteSchema>;
