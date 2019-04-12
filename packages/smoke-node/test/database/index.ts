import { Database } from '../../src/database'
import { expect }   from 'chai'
import * as support from '../support'

interface Record {
  key:   string
  index: number
}

/** Gives a empty database context */
async function use(func: (database: Database) => Promise<void>): Promise<void> {
  const dbname = support.uuid()
  const database = new Database(dbname)
  await func(database)
  await database.dispose()
  await Database.drop(dbname)
}

/** Gives a database context with 1024 populated records */
async function useWithRecords(func: (database: Database) => Promise<void>): Promise<void> {
  const dbname   = support.uuid()
  const database = new Database(dbname)
  for (const index of support.range(1024)) {
    const key = support.uuid()
    database.insert('records', { key, index })
  }
  await database.commit()
  await func(database)
  await database.dispose()
  await Database.drop(dbname)
}

describe('Database', () => {
  // #region nonexistent store mutations

  it('should count on nonexistent store.', async () => {
    await use(async database => {
      const store = support.uuid()
      const result = await database.count(store)
      expect(result).to.be.eq(0)
    })
  })

  it('should get on nonexistent store.', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()
      const result = await database.get(store, key)
      expect(result).to.be.undefined
    })
  })

  it('should query on nonexistent store.', async () => {
    await use(async database => {
      const store = support.uuid()
      const result = await database.query(store).toArray()
      expect(result).to.have.lengthOf(0)
    })
  })

  it('should insert on nonexistent store.', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()
      database.insert(store, { key })
      await database.commit()
    })
  })


  it(`should test true for 'exists'`, async () => {
    await use(async database => {
      const store = support.uuid()
      const key   = support.uuid()
      const result0 = await database.exists(store, key)
      database.insert(store, { key })
      await database.commit()
      const result1 = await database.exists(store, key)
      database.delete(store, { key })
      await database.commit()
      const result2 = await database.exists(store, key)
      expect(result0).to.be.false
      expect(result1).to.be.true
      expect(result2).to.be.false
    })
  })

  // #region top level database interactions

  it('should get name', async () => {
    await use(async database => {
      const result = await database.name()
      expect(result).to.not.be.undefined
    })
  })

  it('should get version', async () => {
    await use(async database => {
      const result = await database.version()
      expect(result).to.not.be.undefined
    })
  })

  it('should insert and get', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()
      database.insert(store, { key })
      await database.commit()
      const record = await database.get(store, key)
      expect(record).to.not.be.undefined
    })
  })

  it('should insert and update', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()
      const value = support.uuid()
      database.insert(store, { key })
      await database.commit()

      await database.update(store, { key, value })
      await database.commit()

      const record = (await database.get(store, key)) as any
      expect(record.value).to.eq(value)
    })
  })

  it('should insert and delete', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()

      database.insert(store, { key })
      await database.commit()

      const record0 = await database.get(store, key)
      expect(record0).to.not.be.undefined

      await database.delete(store, { key })
      await database.commit()

      const record1 = await database.get(store, key)
      expect(record1).to.be.undefined
    })
  })

  it('should insert and delete with string key', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()

      database.insert(store, { key })
      await database.commit()

      const record0 = await database.get(store, key)
      expect(record0).to.not.be.undefined

      await database.delete(store, key)
      await database.commit()

      const record1 = await database.get(store, key)
      expect(record1).to.be.undefined
    })
  })

  it('should insert 256 records in single store and count', async () => {
    await use(async database => {
      const count = 32
      const store = support.uuid()
      const keys = support.range(count).map(n => support.uuid())
      for (const key of keys) {
        database.insert(store, { key })
      }
      await database.commit()
      const result = await database.count(store)

      expect(result).to.be.eq(count)
    })
  })

  it('should insert 8 stores with 1 record and count stores', async () => {
    await use(async database => {
      const count = 8
      const stores = support.range(count).map(n => support.uuid())
      const key = support.uuid()
      for (const store of stores) {
        database.insert(store, { key })
      }
      await database.commit()
      const result = await database.stores()
      expect(result).to.have.lengthOf(count)
    })
  })

  it('should insert and drop store', async () => {
    await use(async database => {
      const store = support.uuid()
      const key = support.uuid()
      database.insert(store, { key })
      await database.commit()

      const result0 = await database.get(store, key)
      expect(result0).to.not.be.undefined

      await database.drop(store)

      const result1 = await database.get(store, key)
      expect(result1).to.be.undefined
    })
  })

  // #region query

  it(`should run query with 'toArray'`, async () => {
    await useWithRecords(async database => {
      const result = await database.query<Record>('records').toArray()
      expect(result).to.have.lengthOf(1024)
    })
  })

  it(`should run query with 'aggregate'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .select(n => 1)
        .aggregate((acc, c) => acc + c, 0)
      expect(result).to.be.eq(1024)
    })
  })
  it(`should run query with 'all' > true`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .all(n => n.index >= 0 && n.index < 1024)
      expect(result).to.be.eq(true)
    })
  })

  it(`should run query with 'all' > false`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .all(n => n.index > 0 && n.index < 1024)
      expect(result).to.be.eq(false)
    })
  })

  it(`should run query with 'average'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .select(n => 1)
        .average(n => n)
      expect(result).to.be.eq(1)
    })
  })

  it(`should run query with 'any' > true`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .any(n => n.index > 0)
      expect(result).to.be.eq(true)
    })
  })

  it(`should run query with 'any' > false`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .any(n => n.index < 0)
      expect(result).to.be.eq(false)
    })
  })

  it(`should run query with 'concat'`, async () => {
    await useWithRecords(async database => {
      const query0 = await database
        .query<Record>('records')
        .select(n => n.index)
      const query1 = await database
        .query<Record>('records')
        .select(n => n.index + 1024)
      const query2 = query0.concat(query1).orderBy(n => n)
      const array = await query2.toArray()
      for (let i = 0; i < 2048; i++) {
        expect(array[i]).to.eq(i)
      }
    })
  })

  it(`should run query with 'count'`, async () => {
    await useWithRecords(async database => {
      const result = await database.query<Record>('records').count()
      expect(result).to.be.eq(1024)
    })
  })

  it(`should run query with 'distinct'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .select(n => n.index % 4)
        .distinct(n => n)
        .toArray()
      expect(result).to.have.lengthOf(4)
    })
  })

  it(`should run query with 'elementAt'`, async () => {
    await useWithRecords(async database => {
      const result0 = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .elementAt(0)
      const result1 = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .elementAt(128)
      const result2 = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .elementAt(256)
      const result3 = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .elementAt(512)
      const result4 = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .elementAt(1025)
      expect(result0!.index).to.be.eq(0)
      expect(result1!.index).to.be.eq(128)
      expect(result2!.index).to.be.eq(256)
      expect(result3!.index).to.be.eq(512)
      expect(result4).to.be.undefined
    })
  })

  it(`should run query with 'first'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .first()
      expect(result!.index).to.be.eq(0)
    })
  })

  it(`should run query with 'last'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderByDescending(n => n.index)
        .last()
      expect(result!.index).to.be.eq(0)
    })
  })
  it(`should run query with 'orderBy'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .first()
      expect(result!.index).to.be.eq(0)
    })
  })

  it(`should run query with 'orderByDescending'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderByDescending(n => n.index)
        .first()
      expect(result!.index).to.be.eq(1023)
    })
  })

  it(`should run query with 'reverse'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderByDescending(n => n.index)
        .reverse()
        .first()
      expect(result!.index).to.be.eq(0)
    })
  })

  it(`should run query with 'select'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .select(n => n.index)
        .toArray()
      expect(result).to.have.lengthOf(1024)
    })
  })

  it(`should run query with 'selectMany'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .select(n => [n.index, 1])
        .selectMany(n => n)
        .toArray()
      expect(result).to.have.lengthOf(2048)
    })
  })

  it(`should run query with 'skip'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .skip(512)
        .toArray()
      expect(result).to.have.lengthOf(512)
      expect(result[0].index).to.be.eq(512)
    })
  })

  it(`should run query with 'sum'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .select(n => 1)
        .sum(n => n)
      expect(result).to.be.eq(1024)
    })
  })

  it(`should run query with 'take'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .take(512)
        .toArray()
      expect(result).to.have.lengthOf(512)
      expect(result[0].index).to.be.eq(0)
      expect(result[511].index).to.be.eq(511)
    })
  })

  it(`should run query with 'where'`, async () => {
    await useWithRecords(async database => {
      const result = await database
        .query<Record>('records')
        .orderBy(n => n.index)
        .where(n => n.index < 512)
        .toArray()
      expect(result).to.have.lengthOf(512)
      expect(result[0].index).to.be.eq(0)
      expect(result[511].index).to.be.eq(511)
    })
  })

  // #region enumeration

  it(`should enumerate records with 'asyncIterator'`, async () => {
    await useWithRecords(async database => {
      const query = await database.query<Record>('records')
      let count = 0
      for await (const record of query) {
        expect(record).to.not.be.undefined
        count++
      }
      expect(count).to.eq(1024)
    })
  })

  // #region drop database

  it(`should 'drop' database and re-open and test empty`, async () => {
    const name = support.uuid()
    const key = support.uuid()
    const store = support.uuid()
    const db0 = new Database(name)
    db0.insert(store, { key })
    await db0.commit()
    const result0 = await db0.get(store, key)
    expect(result0).to.not.be.undefined
    await db0.dispose()

    await Database.drop(name)

    const db1 = new Database(name)
    const result1 = await db1.get(store, key)
    expect(result1).to.be.undefined
  })
})
