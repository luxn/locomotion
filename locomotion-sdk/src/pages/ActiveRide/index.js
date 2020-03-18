import React, {
  useState, useEffect, useRef,
} from 'react';
import {
  StyleSheet, PermissionsAndroid, Platform,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import moment from 'moment';

import network from '../../services/network';
import getPosition from './AddressView/getPostion';
import AddressView from './AddressView';
import {
  PageContainer, StopPointDot, VehicleDot,
} from './styled';
import Header from '../../Components/Header';
import RideDrawer from './RideDrawer';
import { getTogglePopupsState } from '../../context/main';
import UserService from '../../services/user';
import OneSignal from '../../services/one-signal';
import settingsContext from '../../context/settings';

function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default ({ navigation }) => {
  const [activeRideState, setActiveRide] = useState(null);
  const [preRideDetails, setPreRideDetails] = useState({});
  const [mapRegion, setMapRegion] = useState({
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [activeSpState, setActiveSp] = useState(null);
  const [numberOfPassengers, setNumberOfPassengers] = useState(1);
  const [stopPoints, setStopPoints] = useState(null);
  const [, togglePopup] = getTogglePopupsState();
  const [requestStopPoints, setRequestStopPoints] = useState({
    openEdit: false,
  });
  const [rideType, setRideType] = useState('pool');
  const [pickupEta, setPickupEta] = useState(null);
  const [displayMatchInfo, setDisplayMatchInfo] = useState(false);
  const [rideOffer, setRideOffer] = useState(null);
  const [offerExpired, setOfferExpired] = useState(false);
  const [offerTimer, setOfferTimer] = useState(false);
  const mapInstance = useRef();

  const loadActiveRide = async () => {
    const { data: response } = await network.get('api/v1/me/rides/active', { params: { activeRide: true } });
    const activeRide = response.ride;
    if (activeRide) {
      const [pickup, dropoff] = activeRide.stop_points;
      setStopPoints({
        pickup,
        dropoff,
      });
      let activeSp = activeRide.stop_points.find(sp => sp.state === 'pending');
      if (activeSp && activeSp.polyline) {
        activeSp = {
          ...activeSp,
          polyline: polyline.decode(activeSp.polyline)
            .map(tuple => ({ latitude: tuple[0], longitude: tuple[1] })),
        };
        setActiveSp(activeSp);
        if (!activeRideState || activeRideState.state !== activeRide.state
          || activeSp.id !== activeSpState.id) {
          setTimeout(() => {
            mapInstance.current.fitToElements(true);
          }, 500);
        }
      }
      return setActiveRide(activeRide);
    }

    if (activeRideState && activeRideState.stop_points[0].completed_at) {
      // Ride completed
      togglePopup('rideOver', true);
    }
    if (activeRideState && !activeRideState.stop_points[0].completed_at) {
      // Ride canceled
      togglePopup('rideCancel', true);
    }
    setActiveSp(null);
    setStopPoints(null);
    return setActiveRide(null);
  };

  useInterval(() => {
    loadActiveRide();
  }, 5000);

  useEffect(() => {
    UserService.getUser(navigation);
    loadActiveRide();
    OneSignal.init();
  }, []);

  useInterval(() => {
    UserService.getUser(navigation);
  }, 10000);

  useEffect(() => {
    console.log(activeRideState);
    if (!activeRideState) {
      return;
    }
    const origin = activeRideState.stop_points[0];
    calculatePickupEta(origin);
  }, [activeRideState]);

  const bookValidation = state => state
    && state.dropoff && state.dropoff.lat
    && state.pickup && state.pickup.lat;

  const loadPreRideDetails = async (origin, destination) => {
    return;
    try {
      const { data } = await network.get('api/v1/me/rides/pre', { params: { origin, destination } });
      setPreRideDetails(data);
    } catch (error) {
      console.log('Got error while try to get pre detail on a ride', error);
    }
  };

  const onLocationSelect = (location) => {
    const newState = {
      ...requestStopPoints,
      [location.type]: location,
    };
    const bookValid = bookValidation(newState);
    newState.openEdit = !bookValid;

    if (bookValid) {
      loadPreRideDetails(newState.pickup, newState.dropoff);
    }

    setRequestStopPoints(newState);
  };

  const openLocationSelect = () => {
    if (activeRideState && activeRideState.vehicle) {
      return;
    }
    const newState = {
      ...requestStopPoints,
      openEdit: true,
    };
    setRequestStopPoints(newState);
  };

  const createRide = async () => {
    clearTimeout(offerTimer);

    const { data: response } = await network.post('api/v1/me/rides', {
      pickupAddress: requestStopPoints.pickup.description,
      pickupLat: requestStopPoints.pickup.lat,
      pickupLng: requestStopPoints.pickup.lng,
      dropoffAddress: requestStopPoints.dropoff.description,
      dropoffLat: requestStopPoints.dropoff.lat,
      dropoffLng: requestStopPoints.dropoff.lng,
      numberOfPassengers,
      rideType,
    });
    if (response.state === 'rejected') {
      setRideOffer(null);
      togglePopup('rideRejected', true);
    } else {
      setTimeout(async () => {
        await loadActiveRide();
        setRideOffer(null);
      }, 2500);
    }
  };

  const createOffer = async () => {
    const { data: response } = await network.post('api/v1/me/rides/offer', {
      pickupAddress: requestStopPoints.pickup.description,
      pickupLat: requestStopPoints.pickup.lat,
      pickupLng: requestStopPoints.pickup.lng,
      dropoffAddress: requestStopPoints.dropoff.description,
      dropoffLat: requestStopPoints.dropoff.lat,
      dropoffLng: requestStopPoints.dropoff.lng,
      numberOfPassengers,
      rideType,
    });


    if (response.state === 'rejected') {
      togglePopup('rideRejected', true);
    } else {
      setRideOffer(response);
    }
  };

  const cancelRide = async () => {
    await network.post('api/v1/me/rides/cancel-active-ride');
    return loadActiveRide();
  };

  const cancelOffer = () => {
    setRideOffer(null);
  };


  const calculatePickupEta = (origin) => {
    if (origin.completed_at) {
      setDisplayMatchInfo(true);
    } else if (origin && origin.eta) {
      const etaDiff = moment(origin.eta).diff(moment(), 'minutes');
      setPickupEta(etaDiff);
      setDisplayMatchInfo(etaDiff <= useSettings.settingsList.ARRIVE_REMINDER_MIN);
    }
  };

  const showsUserLocation = !activeRideState || !activeRideState.vehicle;
  const useSettings = settingsContext.useContainer();

  const setClosestStations = async () => {
    let closestStation;
    try {
      const { coords } = await getPosition();
      const { data } = await network.get('api/v1/me/places', {
        params: {
          location: { lat: coords.latitude, lng: coords.longitude },
        },
      });
      console.log(data);

      closestStation = data[0];
    } catch (error) {
      console.log('Got error while try to get current place', error);
    }
    setRequestStopPoints({
      openEdit: false,
      pickup: closestStation,
    });
  };

  useEffect(() => {
    setClosestStations();
  }, []);

  useEffect(() => {
    let offerTimeout;
    console.log(rideOffer);

    if (rideOffer) {
      setOfferExpired(false);
      setOfferTimer(setTimeout(() => {
        setOfferExpired(true);
      }, 10000));
    } else {
      clearTimeout(offerTimer);
    }
  }, [rideOffer]);

  useEffect(() => {
    console.log('NUMMM');
    console.log(rideOffer);
  }, [rideOffer]);
  /*   useEffect(() => {
    const offer = {
      id: 'cf37a79b-fcc5-4e4a-86c6-13b50c8ceefb',
      status: 'created',
      eta: '2020-03-16T13:44:44.947Z',
      expires_at: '2020-03-16T13:37:11.801Z',
      pickup: {
        eta: moment().add(10).format(),
      },
      dropoff: {
        eta: moment().add(20, 'minutes').format(),
      },
    };
    setRideOffer(offer);
  }, []); */
  return (
    <PageContainer>
      <MapView
        showsUserLocation={showsUserLocation}
        style={StyleSheet.absoluteFillObject}
        showsMyLocationButton={false}
        loadingEnabled
        key="map"
        followsUserLocation
        onUserLocationChange={(event) => {
          if (Platform.OS === 'ios' || !showsUserLocation) {
            return; // Follow user location works for iOS
          }
          const { coordinate } = event.nativeEvent;
          mapInstance.current.animateToRegion({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: mapRegion.latitudeDelta,
            longitudeDelta: mapRegion.longitudeDelta,
          }, 1000);

          setMapRegion(oldMapRegion => ({
            ...oldMapRegion,
            ...coordinate,
          }));
        }}
        ref={mapInstance}
        onMapReady={() => {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
        }}
      >
        {activeSpState && displayMatchInfo
          ? (
            <Polyline
              strokeWidth={3}
              strokeColor="#8ac1ff"
              coordinates={activeSpState.polyline}
            />
          ) : null}
        {activeSpState
          ? (
            <Marker
              coordinate={activeSpState.polyline[activeSpState.polyline.length - 1]}
            >
              <StopPointDot />

            </Marker>
          ) : null}
        {activeRideState && activeRideState.vehicle && activeRideState.vehicle.location && displayMatchInfo
          ? (
            <Marker
              coordinate={{ latitude: activeRideState.vehicle.location.lat, longitude: activeRideState.vehicle.location.lng }}
            >
              <VehicleDot />
            </Marker>
          ) : null}
      </MapView>
      <Header navigation={navigation} />
      <RideDrawer
        createRide={createRide}
        cancelRide={cancelRide}
        createOffer={createOffer}
        readyToBook={bookValidation(requestStopPoints)}
        openLocationSelect={openLocationSelect}
        requestStopPoints={requestStopPoints}
        activeRide={activeRideState}
        rideType={rideType}
        setRideType={setRideType}
        preRideDetails={preRideDetails}
        onNumberOfPassengerChange={setNumberOfPassengers}
        numberOfPassenger={numberOfPassengers}
        rideOffer={rideOffer}
        cancelOffer={cancelOffer}
        offerExpired={offerExpired}
      />
      {
          requestStopPoints.openEdit
            ? <AddressView onLocationSelect={onLocationSelect} requestStopPoints={requestStopPoints} />
            : null
        }
    </PageContainer>
  );
};
