-- CreateTable
CREATE TABLE "AgentInvocation" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutesSinceStart" INTEGER NOT NULL,
    "invocationCount" INTEGER NOT NULL,
    "accountValue" DOUBLE PRECISION NOT NULL,
    "availableCash" DOUBLE PRECISION NOT NULL,
    "totalReturn" DOUBLE PRECISION NOT NULL,
    "btcData" JSONB NOT NULL,
    "openPositions" JSONB NOT NULL,
    "toolCalls" JSONB,
    "response" TEXT NOT NULL,

    CONSTRAINT "AgentInvocation_pkey" PRIMARY KEY ("id")
);
