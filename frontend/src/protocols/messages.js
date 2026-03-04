/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const wca_chat = $root.wca_chat = (() => {

    /**
     * Namespace wca_chat.
     * @exports wca_chat
     * @namespace
     */
    const wca_chat = {};

    wca_chat.ChatMessage = (function() {

        /**
         * Properties of a ChatMessage.
         * @memberof wca_chat
         * @interface IChatMessage
         * @property {string|null} [messageId] ChatMessage messageId
         * @property {string|null} [senderId] ChatMessage senderId
         * @property {string|null} [targetId] ChatMessage targetId
         * @property {wca_chat.ChatMessage.MessageType|null} [type] ChatMessage type
         * @property {Uint8Array|null} [payload] ChatMessage payload
         * @property {number|Long|null} [sentAt] ChatMessage sentAt
         * @property {number|Long|null} [receivedAt] ChatMessage receivedAt
         * @property {boolean|null} [isHighPriority] ChatMessage isHighPriority
         * @property {boolean|null} [isGroupMessage] ChatMessage isGroupMessage
         * @property {wca_chat.ChatMessage.IAttachment|null} [attachment] ChatMessage attachment
         */

        /**
         * Constructs a new ChatMessage.
         * @memberof wca_chat
         * @classdesc Represents a ChatMessage.
         * @implements IChatMessage
         * @constructor
         * @param {wca_chat.IChatMessage=} [properties] Properties to set
         */
        function ChatMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ChatMessage messageId.
         * @member {string} messageId
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.messageId = "";

        /**
         * ChatMessage senderId.
         * @member {string} senderId
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.senderId = "";

        /**
         * ChatMessage targetId.
         * @member {string} targetId
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.targetId = "";

        /**
         * ChatMessage type.
         * @member {wca_chat.ChatMessage.MessageType} type
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.type = 0;

        /**
         * ChatMessage payload.
         * @member {Uint8Array} payload
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.payload = $util.newBuffer([]);

        /**
         * ChatMessage sentAt.
         * @member {number|Long} sentAt
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.sentAt = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * ChatMessage receivedAt.
         * @member {number|Long} receivedAt
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.receivedAt = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * ChatMessage isHighPriority.
         * @member {boolean} isHighPriority
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.isHighPriority = false;

        /**
         * ChatMessage isGroupMessage.
         * @member {boolean} isGroupMessage
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.isGroupMessage = false;

        /**
         * ChatMessage attachment.
         * @member {wca_chat.ChatMessage.IAttachment|null|undefined} attachment
         * @memberof wca_chat.ChatMessage
         * @instance
         */
        ChatMessage.prototype.attachment = null;

        /**
         * Creates a new ChatMessage instance using the specified properties.
         * @function create
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {wca_chat.IChatMessage=} [properties] Properties to set
         * @returns {wca_chat.ChatMessage} ChatMessage instance
         */
        ChatMessage.create = function create(properties) {
            return new ChatMessage(properties);
        };

        /**
         * Encodes the specified ChatMessage message. Does not implicitly {@link wca_chat.ChatMessage.verify|verify} messages.
         * @function encode
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {wca_chat.IChatMessage} message ChatMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChatMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.messageId != null && Object.hasOwnProperty.call(message, "messageId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.messageId);
            if (message.senderId != null && Object.hasOwnProperty.call(message, "senderId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.senderId);
            if (message.targetId != null && Object.hasOwnProperty.call(message, "targetId"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.targetId);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.type);
            if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.payload);
            if (message.sentAt != null && Object.hasOwnProperty.call(message, "sentAt"))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.sentAt);
            if (message.receivedAt != null && Object.hasOwnProperty.call(message, "receivedAt"))
                writer.uint32(/* id 7, wireType 0 =*/56).int64(message.receivedAt);
            if (message.isHighPriority != null && Object.hasOwnProperty.call(message, "isHighPriority"))
                writer.uint32(/* id 8, wireType 0 =*/64).bool(message.isHighPriority);
            if (message.isGroupMessage != null && Object.hasOwnProperty.call(message, "isGroupMessage"))
                writer.uint32(/* id 9, wireType 0 =*/72).bool(message.isGroupMessage);
            if (message.attachment != null && Object.hasOwnProperty.call(message, "attachment"))
                $root.wca_chat.ChatMessage.Attachment.encode(message.attachment, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link wca_chat.ChatMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {wca_chat.IChatMessage} message ChatMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChatMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ChatMessage message from the specified reader or buffer.
         * @function decode
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wca_chat.ChatMessage} ChatMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChatMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.wca_chat.ChatMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.messageId = reader.string();
                        break;
                    }
                case 2: {
                        message.senderId = reader.string();
                        break;
                    }
                case 3: {
                        message.targetId = reader.string();
                        break;
                    }
                case 4: {
                        message.type = reader.int32();
                        break;
                    }
                case 5: {
                        message.payload = reader.bytes();
                        break;
                    }
                case 6: {
                        message.sentAt = reader.int64();
                        break;
                    }
                case 7: {
                        message.receivedAt = reader.int64();
                        break;
                    }
                case 8: {
                        message.isHighPriority = reader.bool();
                        break;
                    }
                case 9: {
                        message.isGroupMessage = reader.bool();
                        break;
                    }
                case 10: {
                        message.attachment = $root.wca_chat.ChatMessage.Attachment.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wca_chat.ChatMessage} ChatMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChatMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ChatMessage message.
         * @function verify
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ChatMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.messageId != null && message.hasOwnProperty("messageId"))
                if (!$util.isString(message.messageId))
                    return "messageId: string expected";
            if (message.senderId != null && message.hasOwnProperty("senderId"))
                if (!$util.isString(message.senderId))
                    return "senderId: string expected";
            if (message.targetId != null && message.hasOwnProperty("targetId"))
                if (!$util.isString(message.targetId))
                    return "targetId: string expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            if (message.payload != null && message.hasOwnProperty("payload"))
                if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                    return "payload: buffer expected";
            if (message.sentAt != null && message.hasOwnProperty("sentAt"))
                if (!$util.isInteger(message.sentAt) && !(message.sentAt && $util.isInteger(message.sentAt.low) && $util.isInteger(message.sentAt.high)))
                    return "sentAt: integer|Long expected";
            if (message.receivedAt != null && message.hasOwnProperty("receivedAt"))
                if (!$util.isInteger(message.receivedAt) && !(message.receivedAt && $util.isInteger(message.receivedAt.low) && $util.isInteger(message.receivedAt.high)))
                    return "receivedAt: integer|Long expected";
            if (message.isHighPriority != null && message.hasOwnProperty("isHighPriority"))
                if (typeof message.isHighPriority !== "boolean")
                    return "isHighPriority: boolean expected";
            if (message.isGroupMessage != null && message.hasOwnProperty("isGroupMessage"))
                if (typeof message.isGroupMessage !== "boolean")
                    return "isGroupMessage: boolean expected";
            if (message.attachment != null && message.hasOwnProperty("attachment")) {
                let error = $root.wca_chat.ChatMessage.Attachment.verify(message.attachment);
                if (error)
                    return "attachment." + error;
            }
            return null;
        };

        /**
         * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wca_chat.ChatMessage} ChatMessage
         */
        ChatMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.wca_chat.ChatMessage)
                return object;
            let message = new $root.wca_chat.ChatMessage();
            if (object.messageId != null)
                message.messageId = String(object.messageId);
            if (object.senderId != null)
                message.senderId = String(object.senderId);
            if (object.targetId != null)
                message.targetId = String(object.targetId);
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "TEXT":
            case 0:
                message.type = 0;
                break;
            case "PTT":
            case 1:
                message.type = 1;
                break;
            case "BROADCAST_ALERT":
            case 2:
                message.type = 2;
                break;
            case "PRESENCE_UPDATE":
            case 3:
                message.type = 3;
                break;
            }
            if (object.payload != null)
                if (typeof object.payload === "string")
                    $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                else if (object.payload.length >= 0)
                    message.payload = object.payload;
            if (object.sentAt != null)
                if ($util.Long)
                    (message.sentAt = $util.Long.fromValue(object.sentAt)).unsigned = false;
                else if (typeof object.sentAt === "string")
                    message.sentAt = parseInt(object.sentAt, 10);
                else if (typeof object.sentAt === "number")
                    message.sentAt = object.sentAt;
                else if (typeof object.sentAt === "object")
                    message.sentAt = new $util.LongBits(object.sentAt.low >>> 0, object.sentAt.high >>> 0).toNumber();
            if (object.receivedAt != null)
                if ($util.Long)
                    (message.receivedAt = $util.Long.fromValue(object.receivedAt)).unsigned = false;
                else if (typeof object.receivedAt === "string")
                    message.receivedAt = parseInt(object.receivedAt, 10);
                else if (typeof object.receivedAt === "number")
                    message.receivedAt = object.receivedAt;
                else if (typeof object.receivedAt === "object")
                    message.receivedAt = new $util.LongBits(object.receivedAt.low >>> 0, object.receivedAt.high >>> 0).toNumber();
            if (object.isHighPriority != null)
                message.isHighPriority = Boolean(object.isHighPriority);
            if (object.isGroupMessage != null)
                message.isGroupMessage = Boolean(object.isGroupMessage);
            if (object.attachment != null) {
                if (typeof object.attachment !== "object")
                    throw TypeError(".wca_chat.ChatMessage.attachment: object expected");
                message.attachment = $root.wca_chat.ChatMessage.Attachment.fromObject(object.attachment);
            }
            return message;
        };

        /**
         * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {wca_chat.ChatMessage} message ChatMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ChatMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.messageId = "";
                object.senderId = "";
                object.targetId = "";
                object.type = options.enums === String ? "TEXT" : 0;
                if (options.bytes === String)
                    object.payload = "";
                else {
                    object.payload = [];
                    if (options.bytes !== Array)
                        object.payload = $util.newBuffer(object.payload);
                }
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.sentAt = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.sentAt = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.receivedAt = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.receivedAt = options.longs === String ? "0" : 0;
                object.isHighPriority = false;
                object.isGroupMessage = false;
                object.attachment = null;
            }
            if (message.messageId != null && message.hasOwnProperty("messageId"))
                object.messageId = message.messageId;
            if (message.senderId != null && message.hasOwnProperty("senderId"))
                object.senderId = message.senderId;
            if (message.targetId != null && message.hasOwnProperty("targetId"))
                object.targetId = message.targetId;
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.wca_chat.ChatMessage.MessageType[message.type] === undefined ? message.type : $root.wca_chat.ChatMessage.MessageType[message.type] : message.type;
            if (message.payload != null && message.hasOwnProperty("payload"))
                object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
            if (message.sentAt != null && message.hasOwnProperty("sentAt"))
                if (typeof message.sentAt === "number")
                    object.sentAt = options.longs === String ? String(message.sentAt) : message.sentAt;
                else
                    object.sentAt = options.longs === String ? $util.Long.prototype.toString.call(message.sentAt) : options.longs === Number ? new $util.LongBits(message.sentAt.low >>> 0, message.sentAt.high >>> 0).toNumber() : message.sentAt;
            if (message.receivedAt != null && message.hasOwnProperty("receivedAt"))
                if (typeof message.receivedAt === "number")
                    object.receivedAt = options.longs === String ? String(message.receivedAt) : message.receivedAt;
                else
                    object.receivedAt = options.longs === String ? $util.Long.prototype.toString.call(message.receivedAt) : options.longs === Number ? new $util.LongBits(message.receivedAt.low >>> 0, message.receivedAt.high >>> 0).toNumber() : message.receivedAt;
            if (message.isHighPriority != null && message.hasOwnProperty("isHighPriority"))
                object.isHighPriority = message.isHighPriority;
            if (message.isGroupMessage != null && message.hasOwnProperty("isGroupMessage"))
                object.isGroupMessage = message.isGroupMessage;
            if (message.attachment != null && message.hasOwnProperty("attachment"))
                object.attachment = $root.wca_chat.ChatMessage.Attachment.toObject(message.attachment, options);
            return object;
        };

        /**
         * Converts this ChatMessage to JSON.
         * @function toJSON
         * @memberof wca_chat.ChatMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ChatMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ChatMessage
         * @function getTypeUrl
         * @memberof wca_chat.ChatMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ChatMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wca_chat.ChatMessage";
        };

        /**
         * MessageType enum.
         * @name wca_chat.ChatMessage.MessageType
         * @enum {number}
         * @property {number} TEXT=0 TEXT value
         * @property {number} PTT=1 PTT value
         * @property {number} BROADCAST_ALERT=2 BROADCAST_ALERT value
         * @property {number} PRESENCE_UPDATE=3 PRESENCE_UPDATE value
         */
        ChatMessage.MessageType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "TEXT"] = 0;
            values[valuesById[1] = "PTT"] = 1;
            values[valuesById[2] = "BROADCAST_ALERT"] = 2;
            values[valuesById[3] = "PRESENCE_UPDATE"] = 3;
            return values;
        })();

        ChatMessage.Attachment = (function() {

            /**
             * Properties of an Attachment.
             * @memberof wca_chat.ChatMessage
             * @interface IAttachment
             * @property {string|null} [id] Attachment id
             * @property {string|null} [name] Attachment name
             * @property {string|null} [type] Attachment type
             * @property {string|null} [url] Attachment url
             * @property {number|null} [size] Attachment size
             */

            /**
             * Constructs a new Attachment.
             * @memberof wca_chat.ChatMessage
             * @classdesc Represents an Attachment.
             * @implements IAttachment
             * @constructor
             * @param {wca_chat.ChatMessage.IAttachment=} [properties] Properties to set
             */
            function Attachment(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Attachment id.
             * @member {string} id
             * @memberof wca_chat.ChatMessage.Attachment
             * @instance
             */
            Attachment.prototype.id = "";

            /**
             * Attachment name.
             * @member {string} name
             * @memberof wca_chat.ChatMessage.Attachment
             * @instance
             */
            Attachment.prototype.name = "";

            /**
             * Attachment type.
             * @member {string} type
             * @memberof wca_chat.ChatMessage.Attachment
             * @instance
             */
            Attachment.prototype.type = "";

            /**
             * Attachment url.
             * @member {string} url
             * @memberof wca_chat.ChatMessage.Attachment
             * @instance
             */
            Attachment.prototype.url = "";

            /**
             * Attachment size.
             * @member {number} size
             * @memberof wca_chat.ChatMessage.Attachment
             * @instance
             */
            Attachment.prototype.size = 0;

            /**
             * Creates a new Attachment instance using the specified properties.
             * @function create
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {wca_chat.ChatMessage.IAttachment=} [properties] Properties to set
             * @returns {wca_chat.ChatMessage.Attachment} Attachment instance
             */
            Attachment.create = function create(properties) {
                return new Attachment(properties);
            };

            /**
             * Encodes the specified Attachment message. Does not implicitly {@link wca_chat.ChatMessage.Attachment.verify|verify} messages.
             * @function encode
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {wca_chat.ChatMessage.IAttachment} message Attachment message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Attachment.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.type);
                if (message.url != null && Object.hasOwnProperty.call(message, "url"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.url);
                if (message.size != null && Object.hasOwnProperty.call(message, "size"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.size);
                return writer;
            };

            /**
             * Encodes the specified Attachment message, length delimited. Does not implicitly {@link wca_chat.ChatMessage.Attachment.verify|verify} messages.
             * @function encodeDelimited
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {wca_chat.ChatMessage.IAttachment} message Attachment message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Attachment.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Attachment message from the specified reader or buffer.
             * @function decode
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {wca_chat.ChatMessage.Attachment} Attachment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Attachment.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.wca_chat.ChatMessage.Attachment();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.id = reader.string();
                            break;
                        }
                    case 2: {
                            message.name = reader.string();
                            break;
                        }
                    case 3: {
                            message.type = reader.string();
                            break;
                        }
                    case 4: {
                            message.url = reader.string();
                            break;
                        }
                    case 5: {
                            message.size = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Attachment message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {wca_chat.ChatMessage.Attachment} Attachment
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Attachment.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Attachment message.
             * @function verify
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Attachment.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.id != null && message.hasOwnProperty("id"))
                    if (!$util.isString(message.id))
                        return "id: string expected";
                if (message.name != null && message.hasOwnProperty("name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.type != null && message.hasOwnProperty("type"))
                    if (!$util.isString(message.type))
                        return "type: string expected";
                if (message.url != null && message.hasOwnProperty("url"))
                    if (!$util.isString(message.url))
                        return "url: string expected";
                if (message.size != null && message.hasOwnProperty("size"))
                    if (!$util.isInteger(message.size))
                        return "size: integer expected";
                return null;
            };

            /**
             * Creates an Attachment message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {wca_chat.ChatMessage.Attachment} Attachment
             */
            Attachment.fromObject = function fromObject(object) {
                if (object instanceof $root.wca_chat.ChatMessage.Attachment)
                    return object;
                let message = new $root.wca_chat.ChatMessage.Attachment();
                if (object.id != null)
                    message.id = String(object.id);
                if (object.name != null)
                    message.name = String(object.name);
                if (object.type != null)
                    message.type = String(object.type);
                if (object.url != null)
                    message.url = String(object.url);
                if (object.size != null)
                    message.size = object.size | 0;
                return message;
            };

            /**
             * Creates a plain object from an Attachment message. Also converts values to other types if specified.
             * @function toObject
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {wca_chat.ChatMessage.Attachment} message Attachment
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Attachment.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                let object = {};
                if (options.defaults) {
                    object.id = "";
                    object.name = "";
                    object.type = "";
                    object.url = "";
                    object.size = 0;
                }
                if (message.id != null && message.hasOwnProperty("id"))
                    object.id = message.id;
                if (message.name != null && message.hasOwnProperty("name"))
                    object.name = message.name;
                if (message.type != null && message.hasOwnProperty("type"))
                    object.type = message.type;
                if (message.url != null && message.hasOwnProperty("url"))
                    object.url = message.url;
                if (message.size != null && message.hasOwnProperty("size"))
                    object.size = message.size;
                return object;
            };

            /**
             * Converts this Attachment to JSON.
             * @function toJSON
             * @memberof wca_chat.ChatMessage.Attachment
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Attachment.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Attachment
             * @function getTypeUrl
             * @memberof wca_chat.ChatMessage.Attachment
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Attachment.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/wca_chat.ChatMessage.Attachment";
            };

            return Attachment;
        })();

        return ChatMessage;
    })();

    wca_chat.Presence = (function() {

        /**
         * Properties of a Presence.
         * @memberof wca_chat
         * @interface IPresence
         * @property {string|null} [userId] Presence userId
         * @property {wca_chat.Presence.Status|null} [status] Presence status
         */

        /**
         * Constructs a new Presence.
         * @memberof wca_chat
         * @classdesc Represents a Presence.
         * @implements IPresence
         * @constructor
         * @param {wca_chat.IPresence=} [properties] Properties to set
         */
        function Presence(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Presence userId.
         * @member {string} userId
         * @memberof wca_chat.Presence
         * @instance
         */
        Presence.prototype.userId = "";

        /**
         * Presence status.
         * @member {wca_chat.Presence.Status} status
         * @memberof wca_chat.Presence
         * @instance
         */
        Presence.prototype.status = 0;

        /**
         * Creates a new Presence instance using the specified properties.
         * @function create
         * @memberof wca_chat.Presence
         * @static
         * @param {wca_chat.IPresence=} [properties] Properties to set
         * @returns {wca_chat.Presence} Presence instance
         */
        Presence.create = function create(properties) {
            return new Presence(properties);
        };

        /**
         * Encodes the specified Presence message. Does not implicitly {@link wca_chat.Presence.verify|verify} messages.
         * @function encode
         * @memberof wca_chat.Presence
         * @static
         * @param {wca_chat.IPresence} message Presence message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Presence.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.userId != null && Object.hasOwnProperty.call(message, "userId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.userId);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.status);
            return writer;
        };

        /**
         * Encodes the specified Presence message, length delimited. Does not implicitly {@link wca_chat.Presence.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wca_chat.Presence
         * @static
         * @param {wca_chat.IPresence} message Presence message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Presence.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Presence message from the specified reader or buffer.
         * @function decode
         * @memberof wca_chat.Presence
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wca_chat.Presence} Presence
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Presence.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.wca_chat.Presence();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.userId = reader.string();
                        break;
                    }
                case 2: {
                        message.status = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Presence message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wca_chat.Presence
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wca_chat.Presence} Presence
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Presence.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Presence message.
         * @function verify
         * @memberof wca_chat.Presence
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Presence.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.userId != null && message.hasOwnProperty("userId"))
                if (!$util.isString(message.userId))
                    return "userId: string expected";
            if (message.status != null && message.hasOwnProperty("status"))
                switch (message.status) {
                default:
                    return "status: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
            return null;
        };

        /**
         * Creates a Presence message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wca_chat.Presence
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wca_chat.Presence} Presence
         */
        Presence.fromObject = function fromObject(object) {
            if (object instanceof $root.wca_chat.Presence)
                return object;
            let message = new $root.wca_chat.Presence();
            if (object.userId != null)
                message.userId = String(object.userId);
            switch (object.status) {
            default:
                if (typeof object.status === "number") {
                    message.status = object.status;
                    break;
                }
                break;
            case "ONLINE":
            case 0:
                message.status = 0;
                break;
            case "AWAY":
            case 1:
                message.status = 1;
                break;
            case "SLEEPING":
            case 2:
                message.status = 2;
                break;
            case "ON_MISSION":
            case 3:
                message.status = 3;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a Presence message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wca_chat.Presence
         * @static
         * @param {wca_chat.Presence} message Presence
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Presence.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.userId = "";
                object.status = options.enums === String ? "ONLINE" : 0;
            }
            if (message.userId != null && message.hasOwnProperty("userId"))
                object.userId = message.userId;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = options.enums === String ? $root.wca_chat.Presence.Status[message.status] === undefined ? message.status : $root.wca_chat.Presence.Status[message.status] : message.status;
            return object;
        };

        /**
         * Converts this Presence to JSON.
         * @function toJSON
         * @memberof wca_chat.Presence
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Presence.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Presence
         * @function getTypeUrl
         * @memberof wca_chat.Presence
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Presence.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wca_chat.Presence";
        };

        /**
         * Status enum.
         * @name wca_chat.Presence.Status
         * @enum {number}
         * @property {number} ONLINE=0 ONLINE value
         * @property {number} AWAY=1 AWAY value
         * @property {number} SLEEPING=2 SLEEPING value
         * @property {number} ON_MISSION=3 ON_MISSION value
         */
        Presence.Status = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ONLINE"] = 0;
            values[valuesById[1] = "AWAY"] = 1;
            values[valuesById[2] = "SLEEPING"] = 2;
            values[valuesById[3] = "ON_MISSION"] = 3;
            return values;
        })();

        return Presence;
    })();

    wca_chat.Command = (function() {

        /**
         * Properties of a Command.
         * @memberof wca_chat
         * @interface ICommand
         * @property {wca_chat.Command.CommandType|null} [type] Command type
         * @property {string|null} [targetId] Command targetId
         */

        /**
         * Constructs a new Command.
         * @memberof wca_chat
         * @classdesc Represents a Command.
         * @implements ICommand
         * @constructor
         * @param {wca_chat.ICommand=} [properties] Properties to set
         */
        function Command(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Command type.
         * @member {wca_chat.Command.CommandType} type
         * @memberof wca_chat.Command
         * @instance
         */
        Command.prototype.type = 0;

        /**
         * Command targetId.
         * @member {string} targetId
         * @memberof wca_chat.Command
         * @instance
         */
        Command.prototype.targetId = "";

        /**
         * Creates a new Command instance using the specified properties.
         * @function create
         * @memberof wca_chat.Command
         * @static
         * @param {wca_chat.ICommand=} [properties] Properties to set
         * @returns {wca_chat.Command} Command instance
         */
        Command.create = function create(properties) {
            return new Command(properties);
        };

        /**
         * Encodes the specified Command message. Does not implicitly {@link wca_chat.Command.verify|verify} messages.
         * @function encode
         * @memberof wca_chat.Command
         * @static
         * @param {wca_chat.ICommand} message Command message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Command.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.targetId != null && Object.hasOwnProperty.call(message, "targetId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.targetId);
            return writer;
        };

        /**
         * Encodes the specified Command message, length delimited. Does not implicitly {@link wca_chat.Command.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wca_chat.Command
         * @static
         * @param {wca_chat.ICommand} message Command message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Command.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Command message from the specified reader or buffer.
         * @function decode
         * @memberof wca_chat.Command
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wca_chat.Command} Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Command.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.wca_chat.Command();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.type = reader.int32();
                        break;
                    }
                case 2: {
                        message.targetId = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Command message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wca_chat.Command
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wca_chat.Command} Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Command.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Command message.
         * @function verify
         * @memberof wca_chat.Command
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Command.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                    break;
                }
            if (message.targetId != null && message.hasOwnProperty("targetId"))
                if (!$util.isString(message.targetId))
                    return "targetId: string expected";
            return null;
        };

        /**
         * Creates a Command message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wca_chat.Command
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wca_chat.Command} Command
         */
        Command.fromObject = function fromObject(object) {
            if (object instanceof $root.wca_chat.Command)
                return object;
            let message = new $root.wca_chat.Command();
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "SUBSCRIBE_GROUP":
            case 0:
                message.type = 0;
                break;
            case "UNSUBSCRIBE_GROUP":
            case 1:
                message.type = 1;
                break;
            }
            if (object.targetId != null)
                message.targetId = String(object.targetId);
            return message;
        };

        /**
         * Creates a plain object from a Command message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wca_chat.Command
         * @static
         * @param {wca_chat.Command} message Command
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Command.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.type = options.enums === String ? "SUBSCRIBE_GROUP" : 0;
                object.targetId = "";
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.wca_chat.Command.CommandType[message.type] === undefined ? message.type : $root.wca_chat.Command.CommandType[message.type] : message.type;
            if (message.targetId != null && message.hasOwnProperty("targetId"))
                object.targetId = message.targetId;
            return object;
        };

        /**
         * Converts this Command to JSON.
         * @function toJSON
         * @memberof wca_chat.Command
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Command.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Command
         * @function getTypeUrl
         * @memberof wca_chat.Command
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Command.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wca_chat.Command";
        };

        /**
         * CommandType enum.
         * @name wca_chat.Command.CommandType
         * @enum {number}
         * @property {number} SUBSCRIBE_GROUP=0 SUBSCRIBE_GROUP value
         * @property {number} UNSUBSCRIBE_GROUP=1 UNSUBSCRIBE_GROUP value
         */
        Command.CommandType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SUBSCRIBE_GROUP"] = 0;
            values[valuesById[1] = "UNSUBSCRIBE_GROUP"] = 1;
            return values;
        })();

        return Command;
    })();

    wca_chat.ProtocolWrapper = (function() {

        /**
         * Properties of a ProtocolWrapper.
         * @memberof wca_chat
         * @interface IProtocolWrapper
         * @property {wca_chat.IChatMessage|null} [chatMessage] ProtocolWrapper chatMessage
         * @property {wca_chat.IPresence|null} [presence] ProtocolWrapper presence
         * @property {wca_chat.ICommand|null} [command] ProtocolWrapper command
         */

        /**
         * Constructs a new ProtocolWrapper.
         * @memberof wca_chat
         * @classdesc Represents a ProtocolWrapper.
         * @implements IProtocolWrapper
         * @constructor
         * @param {wca_chat.IProtocolWrapper=} [properties] Properties to set
         */
        function ProtocolWrapper(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProtocolWrapper chatMessage.
         * @member {wca_chat.IChatMessage|null|undefined} chatMessage
         * @memberof wca_chat.ProtocolWrapper
         * @instance
         */
        ProtocolWrapper.prototype.chatMessage = null;

        /**
         * ProtocolWrapper presence.
         * @member {wca_chat.IPresence|null|undefined} presence
         * @memberof wca_chat.ProtocolWrapper
         * @instance
         */
        ProtocolWrapper.prototype.presence = null;

        /**
         * ProtocolWrapper command.
         * @member {wca_chat.ICommand|null|undefined} command
         * @memberof wca_chat.ProtocolWrapper
         * @instance
         */
        ProtocolWrapper.prototype.command = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ProtocolWrapper content.
         * @member {"chatMessage"|"presence"|"command"|undefined} content
         * @memberof wca_chat.ProtocolWrapper
         * @instance
         */
        Object.defineProperty(ProtocolWrapper.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["chatMessage", "presence", "command"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ProtocolWrapper instance using the specified properties.
         * @function create
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {wca_chat.IProtocolWrapper=} [properties] Properties to set
         * @returns {wca_chat.ProtocolWrapper} ProtocolWrapper instance
         */
        ProtocolWrapper.create = function create(properties) {
            return new ProtocolWrapper(properties);
        };

        /**
         * Encodes the specified ProtocolWrapper message. Does not implicitly {@link wca_chat.ProtocolWrapper.verify|verify} messages.
         * @function encode
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {wca_chat.IProtocolWrapper} message ProtocolWrapper message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolWrapper.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chatMessage != null && Object.hasOwnProperty.call(message, "chatMessage"))
                $root.wca_chat.ChatMessage.encode(message.chatMessage, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.presence != null && Object.hasOwnProperty.call(message, "presence"))
                $root.wca_chat.Presence.encode(message.presence, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                $root.wca_chat.Command.encode(message.command, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ProtocolWrapper message, length delimited. Does not implicitly {@link wca_chat.ProtocolWrapper.verify|verify} messages.
         * @function encodeDelimited
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {wca_chat.IProtocolWrapper} message ProtocolWrapper message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolWrapper.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ProtocolWrapper message from the specified reader or buffer.
         * @function decode
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {wca_chat.ProtocolWrapper} ProtocolWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolWrapper.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.wca_chat.ProtocolWrapper();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.chatMessage = $root.wca_chat.ChatMessage.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.presence = $root.wca_chat.Presence.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.command = $root.wca_chat.Command.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ProtocolWrapper message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {wca_chat.ProtocolWrapper} ProtocolWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolWrapper.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProtocolWrapper message.
         * @function verify
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProtocolWrapper.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.chatMessage != null && message.hasOwnProperty("chatMessage")) {
                properties.content = 1;
                {
                    let error = $root.wca_chat.ChatMessage.verify(message.chatMessage);
                    if (error)
                        return "chatMessage." + error;
                }
            }
            if (message.presence != null && message.hasOwnProperty("presence")) {
                if (properties.content === 1)
                    return "content: multiple values";
                properties.content = 1;
                {
                    let error = $root.wca_chat.Presence.verify(message.presence);
                    if (error)
                        return "presence." + error;
                }
            }
            if (message.command != null && message.hasOwnProperty("command")) {
                if (properties.content === 1)
                    return "content: multiple values";
                properties.content = 1;
                {
                    let error = $root.wca_chat.Command.verify(message.command);
                    if (error)
                        return "command." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ProtocolWrapper message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {wca_chat.ProtocolWrapper} ProtocolWrapper
         */
        ProtocolWrapper.fromObject = function fromObject(object) {
            if (object instanceof $root.wca_chat.ProtocolWrapper)
                return object;
            let message = new $root.wca_chat.ProtocolWrapper();
            if (object.chatMessage != null) {
                if (typeof object.chatMessage !== "object")
                    throw TypeError(".wca_chat.ProtocolWrapper.chatMessage: object expected");
                message.chatMessage = $root.wca_chat.ChatMessage.fromObject(object.chatMessage);
            }
            if (object.presence != null) {
                if (typeof object.presence !== "object")
                    throw TypeError(".wca_chat.ProtocolWrapper.presence: object expected");
                message.presence = $root.wca_chat.Presence.fromObject(object.presence);
            }
            if (object.command != null) {
                if (typeof object.command !== "object")
                    throw TypeError(".wca_chat.ProtocolWrapper.command: object expected");
                message.command = $root.wca_chat.Command.fromObject(object.command);
            }
            return message;
        };

        /**
         * Creates a plain object from a ProtocolWrapper message. Also converts values to other types if specified.
         * @function toObject
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {wca_chat.ProtocolWrapper} message ProtocolWrapper
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolWrapper.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (message.chatMessage != null && message.hasOwnProperty("chatMessage")) {
                object.chatMessage = $root.wca_chat.ChatMessage.toObject(message.chatMessage, options);
                if (options.oneofs)
                    object.content = "chatMessage";
            }
            if (message.presence != null && message.hasOwnProperty("presence")) {
                object.presence = $root.wca_chat.Presence.toObject(message.presence, options);
                if (options.oneofs)
                    object.content = "presence";
            }
            if (message.command != null && message.hasOwnProperty("command")) {
                object.command = $root.wca_chat.Command.toObject(message.command, options);
                if (options.oneofs)
                    object.content = "command";
            }
            return object;
        };

        /**
         * Converts this ProtocolWrapper to JSON.
         * @function toJSON
         * @memberof wca_chat.ProtocolWrapper
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProtocolWrapper.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ProtocolWrapper
         * @function getTypeUrl
         * @memberof wca_chat.ProtocolWrapper
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ProtocolWrapper.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/wca_chat.ProtocolWrapper";
        };

        return ProtocolWrapper;
    })();

    return wca_chat;
})();

export { $root as default };
