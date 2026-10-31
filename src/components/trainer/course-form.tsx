"use client";

import { useActionState } from "react";
import {
  createCourse,
  updateCourse,
  type FormState,
} from "@/app/trainer/actions";
import { Alert, Field, Input, SubmitButton, inputClass } from "@/components/form";

type CourseValues = {
  id?: string;
  title: string;
  short_description: string;
  description: string;
  price_kobo: number;
  is_published: boolean;
};

const initial: FormState = {};

export function CourseForm({ course }: { course?: CourseValues }) {
  const editing = Boolean(course?.id);
  const [state, formAction] = useActionState(
    editing ? updateCourse : createCourse,
    initial,
  );

  return (
    <form action={formAction} className="space-y-5">
      {course?.id ? <input type="hidden" name="id" value={course.id} /> : null}

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.saved ? <Alert tone="info">Saved.</Alert> : null}

      <Field label="Course title" htmlFor="title" hint="Shown on the home page.">
        <Input
          id="title"
          name="title"
          defaultValue={course?.title ?? ""}
          placeholder="Phone photography for beginners"
          maxLength={90}
          required
        />
      </Field>

      <Field
        label="One-line description"
        htmlFor="short_description"
        hint="One sentence. This is what students see on the card."
      >
        <Input
          id="short_description"
          name="short_description"
          defaultValue={course?.short_description ?? ""}
          placeholder="Take clear, bright photos with the phone you already own."
          maxLength={160}
        />
      </Field>

      <Field
        label="Full description"
        htmlFor="description"
        hint="A few short paragraphs. Leave a blank line between them."
      >
        <textarea
          id="description"
          name="description"
          defaultValue={course?.description ?? ""}
          rows={7}
          maxLength={4000}
          placeholder="What the course covers, who it is for, and what they will be able to do at the end."
          className={`${inputClass} h-auto min-h-32 py-3 leading-relaxed`}
        />
      </Field>

      <Field
        label="Price in naira"
        htmlFor="price_naira"
        hint="Whole naira, no decimals. Use 0 to make the course free."
      >
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted">
            ₦
          </span>
          <Input
            id="price_naira"
            name="price_naira"
            defaultValue={
              course ? String(Math.round(course.price_kobo / 100)) : ""
            }
            inputMode="numeric"
            placeholder="15000"
            className={`${inputClass} pl-8`}
            required
          />
        </div>
      </Field>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={course?.is_published ?? false}
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span className="text-sm">
          <span className="font-medium">Published</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            Published courses appear on the home page. Leave it off while you are
            still adding lessons.
          </span>
        </span>
      </label>

      <SubmitButton pendingLabel="Saving…">
        {editing ? "Save course" : "Create course"}
      </SubmitButton>
    </form>
  );
}
