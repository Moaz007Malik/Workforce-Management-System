function stripMongoFields(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return rest;
}

export class MongoRepository {
  constructor(Model) {
    this.Model = Model;
  }

  async getAll() {
    const docs = await this.Model.find({}).lean();
    return docs.map(stripMongoFields);
  }

  async getById(id) {
    const doc = await this.Model.findOne({ id }).lean();
    return stripMongoFields(doc);
  }

  async create(item) {
    const doc = await this.Model.create(item);
    return doc.toJSON();
  }

  async update(id, updates) {
    const doc = await this.Model.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    );
    return stripMongoFields(doc);
  }

  async delete(id) {
    const result = await this.Model.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async find(predicate) {
    const items = await this.getAll();
    return items.filter(predicate);
  }

  async replaceAll(items) {
    await this.Model.deleteMany({});
    if (items.length > 0) {
      await this.Model.insertMany(items);
    }
  }

  async updateMany(filter, updates) {
    await this.Model.updateMany(filter, { $set: updates });
  }
}
