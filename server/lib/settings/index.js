const settingsDefaults = require('./defaults');
const { Setting } = require('../../models');

const parseValue = (value, type) => {
  if (type === 'number') {
    return parseFloat(value);
  } else if (type === 'json') {
    return JSON.parse(value);
  } else if (type === 'boolean') {
    return value === 'true';
  }

  return value;
};

const getSettingByKeyFromDb = async (settingKey) => {
  const foundSetting = await Setting.findOne({
    where: {
      key: settingKey,
    },
  });

  const simpleSetting = foundSetting ? foundSetting.get() : {};
  const parsedValue = parseValue(simpleSetting.value, simpleSetting.type);
  return {
    ...simpleSetting,
    value: parsedValue,
  };
};

const getAllSettingFromDb = async () => {
  const foundSettings = await Setting.findAll({});
  const settingsList = [];
  foundSettings.map((foundSetting) => {
    const parsedValue = parseValue(foundSetting.value, foundSetting.type);
    settingsList.push({
      ...foundSetting.get(),
      value: parsedValue,
    });
  });
  return settingsList;
};

module.exports = {
  getSettingByKeyFromDb,
  getSettingsList: async () => {
    const settings = await getAllSettingFromDb();
    const settingsList = { ...settingsDefaults };
    settings.map((setting) => {
      settingsList[setting.key] = setting.value;
    });
    return settingsList;
  },
  updateByKey(settingKey, payload) {
    return Setting.update(payload, { where: { key: settingKey } });
  },
  patch(settingId, payload) {
    return Setting.update(payload, { where: { id: settingId } });
  },
  async get(settingId) {
    let foundSetting = await Setting.findById(settingId);
    if (foundSetting) {
      foundSetting = foundSetting.get();
      foundSetting.value = parseValue(foundSetting.value, foundSetting.type);
    } else {
      foundSetting = null;
    }

    return foundSetting;
  },
  delete(settingId) {
    return Setting.destroy({ where: { id: settingId } });
  },
};

