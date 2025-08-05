'use strict';
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    chat_room_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    reactions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    reply_to_message_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'messages',
    timestamps: false
  });

  Message.associate = function(models) {
    // A Message belongs to a ChatRoom
    Message.belongsTo(models.ChatRoom, {
      foreignKey: 'chat_room_id',
      as: 'chatRoom'
    });

    // A Message belongs to a User (the sender)
    Message.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'sender'
    });

    // A Message can reference another Message (reply)
    Message.belongsTo(models.Message, {
      foreignKey: 'reply_to_message_id',
      as: 'replyToMessage'
    });
  };

  return Message;
};
