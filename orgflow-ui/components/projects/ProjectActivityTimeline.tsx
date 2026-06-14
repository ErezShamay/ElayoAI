type Activity = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type Props = {
  activities: Activity[];
  title?: string;
};

export default function ProjectActivityTimeline({
  activities,
  title = "ציר דוחות וביקורים",
}: Props) {

  function formatDate(
    value: string
  ) {

    try {

      return new Date(value)
        .toLocaleString("he-IL");

    } catch {

      return value;
    }
  }

  return (

    <div
      className="
        bg-white
        dark:bg-zinc-900
        border
        border-zinc-200
        dark:border-zinc-800
        rounded-3xl
        p-8
      "
    >

      <div className="mb-6">

        <h2
          className="
            text-2xl
            font-bold
          "
        >
          {title}
        </h2>

      </div>

      {activities.length === 0 && (

        <div
          className="
            flex
            items-center
            justify-center
            h-40
            rounded-2xl
            border
            border-dashed
            border-zinc-300
            dark:border-zinc-700
            text-zinc-500
          "
        >
          אין פעילות זמינה עדיין
        </div>

      )}

      {activities.length > 0 && (

        <div
          className="
            relative
            max-h-62
            overflow-y-auto
            overscroll-contain
            pr-2
          "
        >

          <div
            className="
              absolute
              right-[5px]
              top-0
              bottom-0
              w-px
              bg-zinc-200
              dark:bg-zinc-800
            "
          />

          <div
            className="
              space-y-3
            "
          >

            {activities.map((activity) => (

              <div
                key={activity.id}
                className="
                  relative
                  flex
                  min-h-10
                  items-center
                  gap-4
                "
              >

                <div
                  className="
                    relative
                    z-10
                    w-3
                    h-3
                    rounded-full
                    bg-brand
                    shrink-0
                  "
                />

                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <h3
                    className="
                      truncate
                      font-semibold
                    "
                  >
                    {activity.title}
                  </h3>

                  <div
                    className="
                      shrink-0
                      text-sm
                      text-zinc-500
                      whitespace-nowrap
                    "
                  >
                    {formatDate(
                      activity.created_at
                    )}
                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

    </div>

  );
}
