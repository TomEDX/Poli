import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  deleteSubtopicAction,
  deleteTopicAction,
  moveSubtopicAction,
  moveTopicAction,
  saveSubtopic,
  saveTopic,
} from "../actions";
import type { TopicTree } from "../topics";
import { DeleteButton } from "./delete-button";
import { TopicForm } from "./topic-form";

type MoveButtonsProps = {
  action: (formData: FormData) => Promise<void>;
  id: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
};

function MoveButtons({ action, id, name, isFirst, isLast }: MoveButtonsProps) {
  return (
    <form action={action} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        name="direction"
        value="up"
        variant="ghost"
        size="icon-sm"
        disabled={isFirst}
        aria-label={`Monter « ${name} »`}
        title="Monter"
      >
        <ArrowUp />
      </Button>
      <Button
        type="submit"
        name="direction"
        value="down"
        variant="ghost"
        size="icon-sm"
        disabled={isLast}
        aria-label={`Descendre « ${name} »`}
        title="Descendre"
      >
        <ArrowDown />
      </Button>
    </form>
  );
}

export function TopicTreeEditor({ tree }: { tree: TopicTree }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="new-topic" className="flex flex-col gap-2">
        <h2 id="new-topic" className="font-heading text-lg font-semibold">
          Nouvelle thématique
        </h2>
        <TopicForm action={saveTopic} nameLabel="Nom" submitLabel="Ajouter" />
      </section>

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune thématique pour l&apos;instant.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {tree.map((topic, topicIndex) => (
            <li key={topic.id} className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1">
                  <TopicForm
                    key={`${topic.name}-${topic.slug}`}
                    action={saveTopic}
                    hiddenFields={{ id: topic.id }}
                    name={topic.name}
                    slug={topic.slug}
                    nameLabel="Thématique"
                    submitLabel="Renommer"
                  />
                </div>
                <MoveButtons
                  action={moveTopicAction}
                  id={topic.id}
                  name={topic.name}
                  isFirst={topicIndex === 0}
                  isLast={topicIndex === tree.length - 1}
                />
                <DeleteButton
                  action={deleteTopicAction}
                  id={topic.id}
                  label={`Supprimer « ${topic.name} »`}
                  confirmation={`Supprimer la thématique « ${topic.name} » et ses ${topic.subtopics.length} sous-thématiques ?`}
                />
              </div>

              <div className="flex flex-col gap-3 border-l pl-4">
                {topic.subtopics.length > 0 && (
                  <ol className="flex flex-col gap-3">
                    {topic.subtopics.map((subtopic, subtopicIndex) => (
                      <li key={subtopic.id} className="flex flex-wrap items-end gap-2">
                        <div className="flex-1">
                          <TopicForm
                            key={`${subtopic.name}-${subtopic.slug}`}
                            action={saveSubtopic}
                            hiddenFields={{ id: subtopic.id }}
                            name={subtopic.name}
                            slug={subtopic.slug}
                            nameLabel="Sous-thématique"
                            submitLabel="Renommer"
                          />
                        </div>
                        <MoveButtons
                          action={moveSubtopicAction}
                          id={subtopic.id}
                          name={subtopic.name}
                          isFirst={subtopicIndex === 0}
                          isLast={subtopicIndex === topic.subtopics.length - 1}
                        />
                        <DeleteButton
                          action={deleteSubtopicAction}
                          id={subtopic.id}
                          label={`Supprimer « ${subtopic.name} »`}
                          confirmation={`Supprimer la sous-thématique « ${subtopic.name} » ?`}
                        />
                      </li>
                    ))}
                  </ol>
                )}
                <TopicForm
                  action={saveSubtopic}
                  hiddenFields={{ topicId: topic.id }}
                  nameLabel={`Nouvelle sous-thématique de « ${topic.name} »`}
                  submitLabel="Ajouter"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
