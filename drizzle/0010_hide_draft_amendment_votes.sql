ALTER POLICY "group_votes_public_read_published" ON "group_votes" TO anon,authenticated USING (exists (select 1 from votes join texts on texts.id = votes.text_id
                         left join amendments on amendments.id = votes.amendment_id
                         where votes.id = "group_votes"."vote_id" and texts.status = 'published'
                           and (votes.amendment_id is null or amendments.status = 'published')));--> statement-breakpoint
ALTER POLICY "votes_public_read_published" ON "votes" TO anon,authenticated USING (exists (select 1 from texts where texts.id = "votes"."text_id" and texts.status = 'published')
                 and ("votes"."amendment_id" is null
                      or exists (select 1 from amendments
                                 where amendments.id = "votes"."amendment_id" and amendments.status = 'published')));