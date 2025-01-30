import Bull from "bull"
import imageThumbnail from "image-thumbnail"
import { promises as fs } from "fs"
import { ObjectID } from "mongodb"
import dbClient from "./utils/db"

const fileQueue = new Bull("fileQueue")
const userQueue = new Bull("userQueue")

async function generateThumbnail(path, options) {
  try {
    const thumbnail = await imageThumbnail(path, options)
    const thumbnailPath = `${path}_${options.width}`
    await fs.writeFile(thumbnailPath, thumbnail)
  } catch (error) {
    console.error("Error generating thumbnail:", error)
  }
}

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data
  if (!fileId) throw new Error("Missing fileId")
  if (!userId) throw new Error("Missing userId")

  const file = await dbClient.db.collection("files").findOne({
    _id: ObjectID(fileId),
    userId: ObjectID(userId),
  })

  if (!file) throw new Error("File not found")

  const originalPath = file.localPath
  await generateThumbnail(originalPath, { width: 500 })
  await generateThumbnail(originalPath, { width: 250 })
  await generateThumbnail(originalPath, { width: 100 })
})

userQueue.process(async (job) => {
  const { userId } = job.data
  if (!userId) throw new Error("Missing userId")

  const user = await dbClient.db.collection("users").findOne({ _id: ObjectID(userId) })
  if (!user) throw new Error("User not found")

  console.log(`Welcome ${user.email}!`)
})
