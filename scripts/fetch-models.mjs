// Downloads the MediaPipe models into public/models/ (gitignored) so the app
// runs offline. Runs on postinstall; files already on disk are skipped.
import { existsSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'

const MODELS = [
  {
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    file: 'public/models/pose_landmarker_lite.task'
  }
]

await mkdir('public/models', { recursive: true })

for (const { url, file } of MODELS) {
  if (existsSync(file)) continue
  console.log(`fetch-models: downloading ${file}`)
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    // Written aside then renamed, so a failed download never looks present.
    const partial = `${file}.part`
    await writeFile(partial, Buffer.from(await response.arrayBuffer()))
    await rename(partial, file)
  } catch (error) {
    console.error(`fetch-models: could not download ${url}: ${error.message}`)
    process.exit(1)
  }
}
