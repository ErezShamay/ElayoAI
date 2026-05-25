"use client";

import { use } from "react";

import ProjectTabs from "@/app/components/project-tabs";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default function ReviewsPage({
  params,
}: Props) {

  const resolvedParams =
    use(params);

  return (
    <main
      className="
        p-10
        text-zinc-900
        dark:text-zinc-100
      "
    >

      <ProjectTabs
        projectId={resolvedParams.id}
      />

      <div className="mb-10">

        <h1
          className="
            text-5xl
            font-black
          "
        >
          ביקורות AI
        </h1>

        <p
          className="
            mt-4
            text-zinc-500
          "
        >
          סקירת הביקורות בפרויקט
        </p>

      </div>

    </main>
  );
}