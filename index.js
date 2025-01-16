const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const utils = require('./utils');

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
  .then(games => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then(game => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});

app.post('/api/games/search', (req, res) => {
  const { name, platform } = req.body;
  const where = {};
  if (name) where.name = { [db.Sequelize.Op.like]: `%${name}%` };
  if (platform) where.platform = platform;

  return db.Game.findAll({ where })
    .then((games) => res.send(games))
    .catch((err) => {
      console.log('There was an error querying games', JSON.stringify(err));
      return res.status(500).send(err);
    });
});

app.post('/api/games/populate', async (req, res) => {
  const topIosS3Files = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json';
  const topAndroidS3Files = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json';

  const topIos = await utils.fetchS3FileAsJson(topIosS3Files);
  const topAndroid = await utils.fetchS3FileAsJson(topAndroidS3Files);

  const topGames = [...topIos.flat(), ...topAndroid.flat()];

  for await (const game of topGames) {
    // eslint-disable-next-line no-continue
    if (!game.id || (!Number(game.id) && !Number(game.appId))) continue;
    const shouldITrustAppId = !Number(game.id) && Number(game.appId);

    const gameData = {
      id: !shouldITrustAppId ? Number(game.id) : Number(game.appId),
      publisherId: String(game.publisher_id),
      name: String(game.publisher_name),
      platform: String(game.os),
      storeId: String(game.publisher_id),
      bundleId: String(game.publisher_id),
      appVersion: String(game.version),
      isPublished: true,
    };
    const existingGame = await db.Game.findByPk(game.id);
    if (!existingGame) {
      const gameCreated = await db.Game.create(gameData);
      if (!gameCreated) throw new Error(`Impossible to create game: ${game.id}`);
    } else {
      const gameUpdated = await db.Game.update(
        gameData,
        { where: { id: game.id } },
      );
      if (!gameUpdated) throw new Error(`Impossible to update game: ${game.id}`);
    }
  }

  // return all db
  return db.Game.findAll()
    .then((games) => res.send(games))
    .catch((err) => {
      console.log('There was an error querying games', JSON.stringify(err));
      return res.status(500).send(err);
    });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
