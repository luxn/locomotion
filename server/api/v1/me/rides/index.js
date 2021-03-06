const Router = require('../../../../lib/router');
const rideService = require('../../../../lib/ride');
const getPreRideDetails = require('../../../../lib/pre-ride-details');
const { Ride } = require('../../../../models');
const settingsLib = require('../../../../lib/settings');

const router = Router();

// to check if equal to active
router.get('/', async (req, res) => {
  const rides = await Ride.find({
    where: {
      userId: req.userId,
      state: req.query.activeRide ? Ride.STATES.ACTIVE : undefined,
    },
  });

  res.json({ rides: rides !== null ? rides : [] });
});

router.get('/history', async (req, res) => {
  const rides = await Ride.findAll({
    where: {
      userId: req.userId,
      state: Ride.STATES.COMPLETED,
    },
    order: [['createdAt', 'DESC']],
  });
  res.json({ rides: rides !== null ? rides : [] });
});

router.get('/active', async (req, res) => {
  const ride = await rideService.getRidderActiveRide(req.userId);
  const futureRides = await rideService.getPendingRides(req.userId);

  res.json({ ride, futureRides });
});

router.post('/', async (req, res) => {
  if (req.body.scheduledTo) {
    const pendingRides = await rideService.getPendingRides(req.userId);
    const { MAX_FUTURE_RIDES: maxFutureRides } = await settingsLib.getSettingsList();

    if (pendingRides && pendingRides.length >= maxFutureRides) {
      throw new Error('maximum future orders reached');
    }
  }

  const ride = await rideService.create(req.body, req.userId);
  res.json(ride);
});

router.post('/offer', async (req, res) => {
  const offer = await rideService.createOffer(req.body);
  res.json(offer);
});

router.post('/cancel-active-ride', async (req, res) => {
  const ride = await rideService.cancelActiveRide(req.userId);

  res.json({ ride });
});

router.get('/ride-summary', async (req, res) => {
  const { rideId } = req.query;
  const afRide = await rideService.getRideSummary(req.userId, rideId);
  res.json(afRide);
});

router.post('/rating', async (req, res) => {
  const { externalId, rating } = req.body;
  const ride = await rideService.updateRideRating(req.userId, externalId, rating);
  res.json({ ride });
});

// Get origin destination
// Return ETA + price estimate
router.get('/pre', async (req, res) => {
  const { origin, destination } = req.query;
  const preRideDetails = await getPreRideDetails(JSON.parse(origin), JSON.parse(destination));
  res.json({ ...preRideDetails });
});

router.post('/cancel-future-ride', async (req, res) => {
  const ride = await rideService.cancelFutureRide(req.userId, req.body.rideId);
  res.json({ ride });
});

module.exports = router;
