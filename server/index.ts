import { bundle } from "@remotion/bundler";
import { ensureBrowser } from "@remotion/renderer";
import dotenv from 'dotenv';
import express from "express";
import path from "node:path";
import { type JobState, isCompletedJobWithBuffer, makeRenderQueue } from "./render-queue";
import { generateQuizQuestions } from "./generate-question";

dotenv.config();

const { PORT = 3000, REMOTION_SERVE_URL } = process.env;

function setupApp({ remotionBundleUrl }: { remotionBundleUrl: string }) {
  const app = express();

  const rendersDir = path.resolve("renders");

  const queue = makeRenderQueue({
    port: Number(PORT),
    serveUrl: remotionBundleUrl,
    rendersDir,
  });

  // Host renders on /renders
  app.use("/renders", express.static(rendersDir));
  app.use(express.json());

  // Endpoint to create a new job
  app.post("/renders", async (req, res) => {
    const { quizData, chatId } = req.body;

    if (!quizData || !Array.isArray(quizData.questions)) {
      res.status(400).json({ message: "Valid quiz data is required" });
      return;
    }

    if (!chatId) {
      return res.status(400).json({ message: "Missing chatId is required" });
    }

    const jobId = queue.createJob({ quizData, chatId });

    res.json({ jobId });
  });

  // New endpoint: auto-generate questions with AI and render them
  app.post("/generate-and-render", async (req, res) => {
    const { count = 30, chatId } = req.body;

    if (!chatId) {
      res.status(400).json({ message: "Missing chatId is required" });
      return;
    }

    try {
      const quizData = await generateQuizQuestions(count);
      const jobId = queue.createJob({ quizData, chatId });
      res.json({ jobId, questionCount: quizData.questions.length });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ message: "Failed to generate questions", error: error.message });
    }
  });

  // Endpoint to get a job status
  app.get("/renders/:jobId", (req, res) => {
    const jobId = req.params.jobId;
    const job = queue.jobs.get(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (isCompletedJobWithBuffer(job)) {
      const { buffer, data, ...jobStatus } = job;
      res.json({
        ...jobStatus,
      });
    } else if (job.status === 'failed') {
      const { error, data, ...jobStatus } = job;
      res.json({
        ...jobStatus,
        error: { message: error.message, name: error.name },
      });
    } else if (job.status === 'queued' || job.status === 'in-progress') {
      res.json({
        status: job.status,
        progress: job.status === 'in-progress' ? job.progress : undefined,
      });
    } else {
      const unexpectedJob = job as JobState;
      console.warn(`Unexpected job status in GET /renders/:jobId: ${unexpectedJob.status}`);
      res.status(500).json({ message: "Internal server error: Unexpected job state" });
    }
  });

  // Endpoint to list all job IDs and statuses
  app.get("/renders", (req, res) => {
    const jobSummaries = Array.from(queue.jobs.entries()).map(([id, job]) => {
      const summary: { 
        id: string; 
        status: JobState['status']; 
        progress?: number; 
        error?: { message: string }; 
        telegramSent?: boolean | null; 
        telegramError?: string | null; 
      } = { id, status: job.status }; 

      if (job.status === 'in-progress') {
        summary.progress = job.progress;
      } else if (job.status === 'failed') {
        summary.error = { message: job.error?.message || 'Unknown error' };
      } else if (job.status === 'completed') {
        summary.telegramSent = job.telegramSent;
        if (job.telegramError) {
          summary.telegramError = job.telegramError;
        }
      }
      return summary;
    });
    res.json({ jobs: jobSummaries });
  });

  // Endpoint to cancel a job
  app.delete("/renders/:jobId", (req, res) => {
    const jobId = req.params.jobId;

    const job = queue.jobs.get(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (job.status !== "queued" && job.status !== "in-progress") {
      res.status(400).json({ message: "Job is not cancellable" });
      return;
    }

    job.cancel();

    res.json({ message: "Job cancelled" });
  });

  return app;
}

async function main() {
  await ensureBrowser();

  const remotionBundleUrl = REMOTION_SERVE_URL
    ? REMOTION_SERVE_URL
    : await bundle({
        entryPoint: path.resolve("remotion/index.ts"),
        onProgress(progress) {
          console.info(`Bundling Remotion project: ${progress}%`);
        },
      });

  console.log("Remotion project bundled.");

  const app = setupApp({ remotionBundleUrl });

  app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
});