import { v4 as uuidv4 } from "uuid"
import { ObjectID } from "mongodb"
import mime from "mime-types"
import fs from "fs"
import Bull from "bull"
import dbClient from "../utils/db"
import redisClient from "../utils/redis"

const fileQueue = new Bull("fileQueue")

class FilesController {
  static async postUpload(req, res) {
    const token = req.header("X-Token")
    const userId = await redisClient.get(`auth_${token}`)

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body

    if (!name) {
      return res.status(400).json({ error: "Missing name" })
    }

    if (!type || !["folder", "file", "image"].includes(type)) {
      return res.status(400).json({ error: "Missing type" })
    }

    if (!data && type !== "folder") {
      return res.status(400).json({ error: "Missing data" })
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection("files").findOne({ _id: ObjectID(parentId) })
      if (!parentFile) {
        return res.status(400).json({ error: "Parent not found" })
      }
      if (parentFile.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" })
      }
    }

    const fileDocument = {
      userId: ObjectID(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectID(parentId),
    }

    if (type === "folder") {
      await dbClient.db.collection("files").insertOne(fileDocument)
      return res.status(201).json(fileDocument)
    }

    const filePath = process.env.FOLDER_PATH || "/tmp/files_manager"
    const fileName = `${uuidv4()}`
    const localPath = `${filePath}/${fileName}`

    await fs.promises.writeFile(localPath, Buffer.from(data, "base64"))
    fileDocument.localPath = localPath

    await dbClient.db.collection("files").insertOne(fileDocument)

    fileQueue.add({
      userId: fileDocument.userId.toString(),
      fileId: fileDocument._id.toString(),
    })

    return res.status(201).json(fileDocument)
  }

  static async getShow(req, res) {
    const token = req.header("X-Token")
    const userId = await redisClient.get(`auth_${token}`)

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const fileId = req.params.id
    const file = await dbClient.db.collection("files").findOne({ _id: ObjectID(fileId), userId: ObjectID(userId) })

    if (!file) {
      return res.status(404).json({ error: "Not found" })
    }

    return res.status(200).json(file)
  }

  static async getIndex(req, res) {
    const token = req.header("X-Token")
    const userId = await redisClient.get(`auth_${token}`)

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const parentId = req.query.parentId || "0"
    const page = Number.parseInt(req.query.page) || 0
    const pageSize = 20

    const query = { userId: ObjectID(userId) }
    if (parentId !== "0") {
      query.parentId = ObjectID(parentId)
    }

    const files = await dbClient.db
      .collection("files")
      .find(query)
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray()

    return res.status(200).json(files)
  }

  static async putPublish(req, res) {
    const token = req.header("X-Token")
    const userId = await redisClient.get(`auth_${token}`)

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const fileId = req.params.id
    const file = await dbClient.db.collection("files").findOne({ _id: ObjectID(fileId), userId: ObjectID(userId) })

    if (!file) {
      return res.status(404).json({ error: "Not found" })
    }

    await dbClient.db.collection("files").updateOne({ _id: ObjectID(fileId) }, { $set: { isPublic: true } })

    return res.status(200).json({ ...file, isPublic: true })
  }

  static async putUnpublish(req, res) {
    const token = req.header("X-Token")
    const userId = await redisClient.get(`auth_${token}`)

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const fileId = req.params.id
    const file = await dbClient.db.collection("files").findOne({ _id: ObjectID(fileId), userId: ObjectID(userId) })

    if (!file) {
      return res.status(404).json({ error: "Not found" })
    }

    await dbClient.db.collection("files").updateOne({ _id: ObjectID(fileId) }, { $set: { isPublic: false } })

    return res.status(200).json({ ...file, isPublic: false })
  }

  static async getFile(req, res) {
    const fileId = req.params.id
    const size = req.query.size

    const file = await dbClient.db.collection("files").findOne({ _id: ObjectID(fileId) })

    if (!file) {
      return res.status(404).json({ error: "Not found" })
    }

    const token = req.header("X-Token")
    const userId = await redisClient.get(`auth_${token}`)

    if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
      return res.status(404).json({ error: "Not found" })
    }

    if (file.type === "folder") {
      return res.status(400).json({ error: "A folder doesn't have content" })
    }

    let filePath = file.localPath

    if (size) {
      filePath = `${filePath}_${size}`
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Not found" })
    }

    const mimeType = mime.lookup(file.name)
    res.setHeader("Content-Type", mimeType)

    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  }
}

export default FilesController
