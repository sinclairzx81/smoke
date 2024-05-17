import { Path, Crypto, FileSystem, Buffer } from '@sinclair/smoke'
import { Test, Assert, Hash } from '../test/index.mjs'

Test.describe('FileSystem', () => {
  const databaseName = 'filesystem-test'
  let fs: FileSystem.FileSystem
  Test.before(async () => {
    fs = await FileSystem.open(databaseName)
  })
  Test.after(async () => {
    await FileSystem.remove(databaseName)
  })
  Test.beforeEach(async () => {
    for (const entry of await fs.readdir('/')) {
      await fs.delete(entry)
    }
  })
  // ----------------------------------------------------------------
  // Name
  // ----------------------------------------------------------------
  Test.it('Should return the database name', () => {
    Assert.isEqual(fs.name, databaseName)
  })
  // ----------------------------------------------------------------
  // Write
  // ----------------------------------------------------------------
  Test.it('Should write a file', async () => {
    await fs.write('/file', Buffer.random(128))
  })
  Test.it('Should write and stat', async () => {
    const [path, input] = ['/file', Buffer.random(12345)]
    await fs.write(path, input)
    const stat = (await fs.stat(path)) as FileSystem.FileStat
    Assert.isEqual(stat.type, 'file')
    Assert.isEqual(stat.size, 12345)
  })
  // ----------------------------------------------------------------
  // Stat
  // ----------------------------------------------------------------
  Test.it('Should stat directory', async () => {
    const path = `folder/x/y/z`
    await fs.mkdir(path)
    const stat = (await fs.stat(path)) as FileSystem.DirectoryStat
    Assert.isTrue(stat.type === 'directory')
    Assert.isEqual(stat.path, `/${path}`)
  })
  Test.it('Should stat file', async () => {
    const path = `folder/x/y/z`
    await fs.write(path, Buffer.alloc(4))
    const stat = (await fs.stat(path)) as FileSystem.FileStat
    Assert.isTrue(stat.type === 'file')
    Assert.isEqual(stat.path, `/${path}`)
    Assert.isEqual(stat.size, 4)
    Assert.isTrue(typeof stat.created === 'number')
  })
  // ----------------------------------------------------------------
  // Blob
  // ----------------------------------------------------------------
  Test.it('Should write and read blob', async () => {
    const path = '/file'
    const input = Buffer.alloc(123456)
    await fs.write(path, input)
    const blob = await fs.blob(path)
    const output = new Uint8Array(await blob.arrayBuffer())
    Assert.isEqual(input, output)
  })
  Test.it('Should return empty blob for unknown path', async () => {
    const path = '/file'
    const blob = await fs.blob(path)
    Assert.isTrue(blob.size === 0)
    const output = new Uint8Array(await blob.arrayBuffer())
    Assert.isTrue(output.length === 0)
  })
  // ----------------------------------------------------------------
  // Read
  // ----------------------------------------------------------------
  Test.it('Should write and read', async () => {
    const [path, input] = ['/file', Buffer.random(128)]
    await fs.write(path, input)
    const output = await fs.read(path)
    Assert.isEqual(Hash.Hash(input), Hash.Hash(output))
  })
  Test.it('Should write nested and read', async () => {
    const [path, input] = [`/x/y/z/file`, Buffer.random(128)]
    await fs.write(path, input)
    const output = await fs.read(path)
    const stat1 = await fs.stat(path)
    const stat2 = await fs.stat('/x/y/z')
    const stat3 = await fs.stat('/x/y')
    const stat4 = await fs.stat('/x')

    Assert.isEqual(Hash.Hash(input), Hash.Hash(output))
    Assert.isEqual(stat1.type, 'file')
    Assert.isEqual(stat2.type, 'directory')
    Assert.isEqual(stat3.type, 'directory')
    Assert.isEqual(stat4.type, 'directory')
  })
  Test.it('Should return empty buffer for unknown file', async () => {
    const buffer = await fs.read('/file')
    Assert.isInstanceOf(buffer, Uint8Array)
    Assert.isTrue(buffer.length === 0)
  })
  Test.it('Should write then read range', async () => {
    const [path, data] = ['/file', Buffer.alloc(1_000_000)]
    await fs.write(path, data)
    async function range(start: number, end: number) {
      const blob = new Blob([data])
      const range1 = new Uint8Array(await blob.slice(start, end).arrayBuffer())
      const range2 = await fs.read(path, start, end)
      const hash1 = Hash.Hash(range1)
      const hash2 = Hash.Hash(range2)
      Assert.isEqual(hash1, hash2)
    }
    await range(0, 100)
    await range(500_000, 500_100)
    await range(999_900, 1_000_000)
    await range(999_900, 1_000_100)
  })
  Test.it('Should throw on invalid read range 1', async () => {
    const [path, data] = ['/file', Buffer.alloc(1)]
    await fs.write(path, data)
    await Assert.shouldThrowAsync(async () => await fs.readable(path, -1))
  })
  Test.it('Should throw on invalid read range 2', async () => {
    const [path, data] = ['/file', Buffer.alloc(1)]
    await fs.write(path, data)
    await Assert.shouldThrowAsync(async () => await fs.readable(path, 201, 200))
  })
  // ----------------------------------------------------------------
  // Readir
  // ----------------------------------------------------------------
  Test.it('Should readdir root', async () => {
    const [key1, input1] = ['/key1', Buffer.random(128)]
    const [key2, input2] = ['/key2', Buffer.random(128)]
    const [key3, input3] = ['/key3', Buffer.random(128)]
    await fs.write(key1, input1)
    await fs.write(key2, input2)
    await fs.write(key3, input3)
    const entries = await fs.readdir('/')
    Assert.isTrue(entries.length >= 3)
    Assert.isTrue(entries.includes(Path.basename(key1)))
    Assert.isTrue(entries.includes(Path.basename(key2)))
    Assert.isTrue(entries.includes(Path.basename(key3)))
  })
  Test.it('Should readdir sub directory', async () => {
    const subdirectory = '/folder'
    const [key1, input1] = [`${subdirectory}/key1`, Buffer.random(128)]
    const [key2, input2] = [`${subdirectory}/key2`, Buffer.random(128)]
    const [key3, input3] = [`${subdirectory}/key3`, Buffer.random(128)]
    await fs.write(key1, input1)
    await fs.write(key2, input2)
    await fs.write(key3, input3)
    const entries = await fs.readdir(`${subdirectory}`)
    Assert.isTrue(entries.length === 3)
    Assert.isTrue(entries.includes(Path.basename(key1)))
    Assert.isTrue(entries.includes(Path.basename(key2)))
    Assert.isTrue(entries.includes(Path.basename(key3)))
  })
  Test.it('Should return empty array for unknown directory', async () => {
    const entries = await fs.readdir(`/folder`)
    Assert.isTrue(entries.length === 0)
  })
  // ----------------------------------------------------------------
  // Mkdir
  // ----------------------------------------------------------------
  Test.it('Should make directory', async () => {
    const [path] = ['/folder']
    await fs.mkdir(path)
    Assert.isTrue(await fs.exists(path))
  })
  Test.it('Should make directory twice', async () => {
    const [path] = ['/folder']
    await fs.mkdir(path)
    await fs.mkdir(path)
    Assert.isTrue(await fs.exists(path))
  })
  Test.it('Should throw when creating directory under file path 1', async () => {
    const path = '/folder'
    await fs.write(`${path}`, Buffer.alloc(16))
    await Assert.shouldThrowAsync(async () => fs.mkdir(`${path}/directory`))
  })
  Test.it('Should throw when creating directory under file path 2', async () => {
    const path = '/folder'
    await fs.write(`${path}`, Buffer.alloc(16))
    await Assert.shouldThrowAsync(async () => await fs.write(`${path}/directory/file`, Buffer.alloc(10)))
  })
  // ----------------------------------------------------------------
  // Exists
  // ----------------------------------------------------------------
  Test.it('Should check file exists', async () => {
    const [path, input] = ['/file', Buffer.random(128)]
    await fs.write(path, input)
    Assert.isTrue(await fs.exists(path))
  })
  Test.it('Should check file not exists', async () => {
    const [path] = ['/file']
    Assert.isFalse(await fs.exists(path))
  })
  Test.it('Should check folder exists', async () => {
    const [path] = ['/folder']
    await fs.mkdir(path)
    Assert.isTrue(await fs.exists(path))
  })
  // ----------------------------------------------------------------
  // Delete
  // ----------------------------------------------------------------
  Test.it('Should file write and delete', async () => {
    const [path, input] = ['/file', Buffer.random(128)]
    await fs.write(path, input)
    Assert.isTrue(await fs.exists(path))
    await fs.delete(path)
    Assert.isFalse(await fs.exists(path))
  })
  Test.it('Should file nested write and top directory', async () => {
    const top = '/folder'
    const [path, input] = [`${top}/x/y/z/file`, Buffer.random(128)]
    await fs.write(path, input)
    Assert.isTrue(await fs.exists(`${top}/x/y/z/file`))
    Assert.isTrue(await fs.exists(`${top}/x/y/z`))
    Assert.isTrue(await fs.exists(`${top}/x/y`))
    Assert.isTrue(await fs.exists(`${top}/x`))
    Assert.isTrue(await fs.exists(`${top}`))
    await fs.delete(`${top}`)
    Assert.isFalse(await fs.exists(`${top}/x/y/z/file`))
    Assert.isFalse(await fs.exists(`${top}/x/y/z`))
    Assert.isFalse(await fs.exists(`${top}/x/y`))
    Assert.isFalse(await fs.exists(`${top}/x`))
    Assert.isFalse(await fs.exists(`${top}`))
  })
  // ----------------------------------------------------------------
  // Throws
  // ----------------------------------------------------------------
  Test.it('Should throw invalid path 1', async () => {
    await Assert.shouldThrowAsync(async () => await fs.write('/a/../test', Buffer.alloc(0)))
  })
  Test.it('Should throw invalid path 2', async () => {
    await Assert.shouldThrowAsync(async () => await fs.write('~/a/../test', Buffer.alloc(0)))
  })
  Test.it('Should throw invalid path 3', async () => {
    await Assert.shouldThrowAsync(async () => await fs.write('~/a//test', Buffer.alloc(0)))
  })
  // ----------------------------------------------------------------
  // Seperators
  // ----------------------------------------------------------------
  Test.it('Should write backward then read forward slash', async () => {
    const back = `\\dir\\name`
    const forward = `/dir/name`
    await fs.write(back, Buffer.alloc(5))
    const read = await fs.read(forward)
    Assert.isTrue(read.length === 5)
  })
  Test.it('Should write forward then read backward slash', async () => {
    const back = `\\dir\\name`
    const forward = `/dir/name`
    await fs.write(forward, Buffer.alloc(5))
    const read = await fs.read(back)
    Assert.isTrue(read.length === 5)
  })
  // ----------------------------------------------------------------
  // Rename
  // ----------------------------------------------------------------
  Test.it('Should rename directory (root)', async () => {
    const sourcePath = `/folderA`
    const newName = 'folderB'
    const targetPath = `/${newName}`
    await fs.mkdir(sourcePath)
    await fs.rename(sourcePath, newName)
    Assert.isFalse(await fs.exists(sourcePath))
    Assert.isTrue(await fs.exists(targetPath))
  })
  Test.it('Should rename directory (deep)', async () => {
    const sourcePath = `/foo/bar/baz/folderA`
    const newName = 'folderB'
    const targetPath = `/foo/bar/baz/${newName}`
    await fs.mkdir(sourcePath)
    await fs.rename(sourcePath, newName)
    Assert.isFalse(await fs.exists(sourcePath))
    Assert.isTrue(await fs.exists(targetPath))
  })
  Test.it('Should rename file (root)', async () => {
    const sourcePath = '/fileA'
    const newName = 'fileB'
    const targetPath = `/${newName}`
    const buffer = Buffer.random(2_000_000)
    await fs.write(sourcePath, buffer)
    await fs.rename(sourcePath, newName)
    Assert.isFalse(await fs.exists(sourcePath))
    Assert.isTrue(await fs.exists(targetPath))
    Assert.isEqual(buffer, await fs.read(targetPath))
  })
  Test.it('Should rename file (deep)', async () => {
    const sourcePath = `/foo/bar/baz/fileA`
    const newName = 'fileB'
    const targetPath = `/foo/bar/baz/${newName}`
    const buffer = Buffer.random(2_000_000)
    await fs.write(sourcePath, buffer)
    await fs.rename(sourcePath, newName)
    Assert.isFalse(await fs.exists(sourcePath))
    Assert.isTrue(await fs.exists(targetPath))
    Assert.isEqual(buffer, await fs.read(targetPath))
  })
  Test.it('Should throw on rename when target path exists', async () => {
    const sourcePath = `/foo/bar/baz/fileA`
    const newName = 'fileB'
    const targetPath = `/foo/bar/baz/${newName}`
    const buffer = Buffer.random(128)
    await fs.write(sourcePath, buffer)
    await fs.write(targetPath, buffer)
    await Assert.shouldThrowAsync(() => fs.rename(sourcePath, newName))
  })
  Test.it('Should throw when renaming root', async () => {
    await Assert.shouldThrowAsync(() => fs.rename('/', '/x'))
  })
  // ----------------------------------------------------------------
  // Copy
  // ----------------------------------------------------------------
  Test.it('Should copy file from root', async () => {
    const sourcePath = `/file.txt`
    const targetPath = `/folder`
    const outputPath = Path.join(targetPath, Path.basename(sourcePath))
    const buffer = Buffer.random(2_000_000)
    await fs.write(sourcePath, buffer)
    await fs.copy(sourcePath, targetPath)
    Assert.isEqual(buffer, await fs.read(outputPath))
  })
  Test.it('Should copy file from sub directory to sub directory', async () => {
    const sourcePath = `/x/file.txt`
    const targetPath = `/y`
    const outputPath = Path.join(targetPath, Path.basename(sourcePath))
    const buffer = Buffer.random(2_000_000)
    await fs.write(sourcePath, buffer)
    await fs.copy(sourcePath, targetPath)
    Assert.isEqual(buffer, await fs.read(outputPath))
  })
  Test.it('Should copy sub directory to sub directory', async () => {
    const buffer = Buffer.random(2_000_000)
    await fs.write('/x/y/z/file.txt', buffer)
    await fs.copy('/x', '/w')
    Assert.isEqual(await fs.read('/w/x/y/z/file.txt'), buffer)
    Assert.isEqual((await fs.stat('/w/x/y/z')).type, 'directory')
    Assert.isEqual((await fs.stat('/w/x/y')).type, 'directory')
    Assert.isEqual((await fs.stat('/w/x')).type, 'directory')
    Assert.isEqual((await fs.stat('/w')).type, 'directory')
  })
  Test.it('Should copy sub directory to root', async () => {
    const buffer = Buffer.random(2_000_000)
    await fs.write('/x/y/z/file.txt', buffer)
    await fs.copy('/x/y', '/')
    Assert.isEqual(await fs.read('/y/z/file.txt'), buffer)
    Assert.isEqual((await fs.stat('/y/z')).type, 'directory')
    Assert.isEqual((await fs.stat('/y')).type, 'directory')
  })
  Test.it('Should throw on copy duplicate (root)', async () => {
    const sourcePath = `/file.txt`
    const targetPath = `/`
    const buffer = Buffer.alloc(0)
    await fs.write(sourcePath, buffer)
    await Assert.shouldThrowAsync(() => fs.copy(sourcePath, targetPath))
  })
  Test.it('Should throw on copy duplicate (deep)', async () => {
    const sourcePath = `/a/b/c/file.txt`
    const targetPath = `/a/b/c`
    const buffer = Buffer.alloc(0)
    await fs.write(sourcePath, buffer)
    await Assert.shouldThrowAsync(() => fs.copy(sourcePath, targetPath))
  })
  // ----------------------------------------------------------------
  // Move
  // ----------------------------------------------------------------
  Test.it('Should move file from sub directory to sub directory', async () => {
    const buffer = Buffer.random(2_000_000)
    await fs.write('/x/file', buffer)
    await fs.move('/x/file', '/y')
    Assert.isFalse(await fs.exists('/x/file'))
    Assert.isTrue(await fs.exists('/y/file'))
    Assert.isEqual(await fs.read('/y/file'), buffer)
  })
  Test.it('Should move file from sub directory to root', async () => {
    const buffer = Buffer.random(2_000_000)
    await fs.write('/x/file', buffer)
    await fs.move('/x/file', '/')
    Assert.isTrue(await fs.exists('/x'))
    Assert.isFalse(await fs.exists('/x/file'))
    Assert.isEqual(await fs.read('/file'), buffer)
  })
  Test.it('Should move file form sub directory to sub directory', async () => {
    await fs.mkdir('/x/folder/inner')
    await fs.move('/x/folder', '/y')
    Assert.isFalse(await fs.exists('/x/folder'))
    Assert.isFalse(await fs.exists('/x/folder/inner'))
    Assert.isTrue(await fs.exists('/y/folder'))
    Assert.isTrue(await fs.exists('/y/folder/inner'))
  })
  // ----------------------------------------------------------------
  // File and Folder Conflict
  // ----------------------------------------------------------------
  Test.it('Should throw if creating a file at folder location (root)', async () => {
    await fs.mkdir('/foo')
    Assert.shouldThrowAsync(() => fs.write('/foo', Buffer.alloc(0)))
  })
  Test.it('Should throw if creating a folder at file location (root)', async () => {
    await fs.write('/foo', Buffer.alloc(0))
    Assert.shouldThrowAsync(() => fs.mkdir('/foo'))
  })
  Test.it('Should throw if creating a file at folder location (deep)', async () => {
    await fs.mkdir('/path/foo')
    Assert.shouldThrowAsync(() => fs.write('/path/foo', Buffer.alloc(0)))
  })
  Test.it('Should throw if creating a folder at file location (deep)', async () => {
    await fs.write('/path/foo', Buffer.alloc(0))
    Assert.shouldThrowAsync(() => fs.mkdir('/path/foo'))
  })
})
