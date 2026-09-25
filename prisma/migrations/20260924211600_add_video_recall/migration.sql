-- CreateTable
CREATE TABLE "video_notes" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "takeaways" TEXT[] NOT NULL,
    "concepts" TEXT[] NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recall_cards" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_rating" TEXT,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recall_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recall_attempts" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "response" TEXT,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recall_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_notes_video_id_key" ON "video_notes"("video_id");

-- CreateIndex
CREATE INDEX "recall_cards_due_at_idx" ON "recall_cards"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "recall_cards_video_id_kind_key" ON "recall_cards"("video_id", "kind");

-- CreateIndex
CREATE INDEX "recall_attempts_card_id_idx" ON "recall_attempts"("card_id");

-- AddForeignKey
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_cards" ADD CONSTRAINT "recall_cards_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_attempts" ADD CONSTRAINT "recall_attempts_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "recall_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
