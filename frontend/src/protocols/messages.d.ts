import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace wca_chat. */
export namespace wca_chat {

    /** Properties of a ChatMessage. */
    interface IChatMessage {

        /** ChatMessage messageId */
        messageId?: (string|null);

        /** ChatMessage senderId */
        senderId?: (string|null);

        /** ChatMessage targetId */
        targetId?: (string|null);

        /** ChatMessage type */
        type?: (wca_chat.ChatMessage.MessageType|null);

        /** ChatMessage payload */
        payload?: (Uint8Array|null);

        /** ChatMessage sentAt */
        sentAt?: (number|Long|null);

        /** ChatMessage receivedAt */
        receivedAt?: (number|Long|null);

        /** ChatMessage isHighPriority */
        isHighPriority?: (boolean|null);

        /** ChatMessage isGroupMessage */
        isGroupMessage?: (boolean|null);
    }

    /** Represents a ChatMessage. */
    class ChatMessage implements IChatMessage {

        /**
         * Constructs a new ChatMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: wca_chat.IChatMessage);

        /** ChatMessage messageId. */
        public messageId: string;

        /** ChatMessage senderId. */
        public senderId: string;

        /** ChatMessage targetId. */
        public targetId: string;

        /** ChatMessage type. */
        public type: wca_chat.ChatMessage.MessageType;

        /** ChatMessage payload. */
        public payload: Uint8Array;

        /** ChatMessage sentAt. */
        public sentAt: (number|Long);

        /** ChatMessage receivedAt. */
        public receivedAt: (number|Long);

        /** ChatMessage isHighPriority. */
        public isHighPriority: boolean;

        /** ChatMessage isGroupMessage. */
        public isGroupMessage: boolean;

        /**
         * Creates a new ChatMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ChatMessage instance
         */
        public static create(properties?: wca_chat.IChatMessage): wca_chat.ChatMessage;

        /**
         * Encodes the specified ChatMessage message. Does not implicitly {@link wca_chat.ChatMessage.verify|verify} messages.
         * @param message ChatMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wca_chat.IChatMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link wca_chat.ChatMessage.verify|verify} messages.
         * @param message ChatMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wca_chat.IChatMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ChatMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ChatMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wca_chat.ChatMessage;

        /**
         * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ChatMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wca_chat.ChatMessage;

        /**
         * Verifies a ChatMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ChatMessage
         */
        public static fromObject(object: { [k: string]: any }): wca_chat.ChatMessage;

        /**
         * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
         * @param message ChatMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wca_chat.ChatMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ChatMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ChatMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace ChatMessage {

        /** MessageType enum. */
        enum MessageType {
            TEXT = 0,
            PTT = 1,
            BROADCAST_ALERT = 2,
            PRESENCE_UPDATE = 3
        }
    }

    /** Properties of a Presence. */
    interface IPresence {

        /** Presence userId */
        userId?: (string|null);

        /** Presence status */
        status?: (wca_chat.Presence.Status|null);
    }

    /** Represents a Presence. */
    class Presence implements IPresence {

        /**
         * Constructs a new Presence.
         * @param [properties] Properties to set
         */
        constructor(properties?: wca_chat.IPresence);

        /** Presence userId. */
        public userId: string;

        /** Presence status. */
        public status: wca_chat.Presence.Status;

        /**
         * Creates a new Presence instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Presence instance
         */
        public static create(properties?: wca_chat.IPresence): wca_chat.Presence;

        /**
         * Encodes the specified Presence message. Does not implicitly {@link wca_chat.Presence.verify|verify} messages.
         * @param message Presence message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wca_chat.IPresence, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Presence message, length delimited. Does not implicitly {@link wca_chat.Presence.verify|verify} messages.
         * @param message Presence message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wca_chat.IPresence, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Presence message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Presence
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wca_chat.Presence;

        /**
         * Decodes a Presence message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Presence
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wca_chat.Presence;

        /**
         * Verifies a Presence message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Presence message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Presence
         */
        public static fromObject(object: { [k: string]: any }): wca_chat.Presence;

        /**
         * Creates a plain object from a Presence message. Also converts values to other types if specified.
         * @param message Presence
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wca_chat.Presence, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Presence to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Presence
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace Presence {

        /** Status enum. */
        enum Status {
            ONLINE = 0,
            AWAY = 1,
            SLEEPING = 2,
            ON_MISSION = 3
        }
    }

    /** Properties of a Command. */
    interface ICommand {

        /** Command type */
        type?: (wca_chat.Command.CommandType|null);

        /** Command targetId */
        targetId?: (string|null);
    }

    /** Represents a Command. */
    class Command implements ICommand {

        /**
         * Constructs a new Command.
         * @param [properties] Properties to set
         */
        constructor(properties?: wca_chat.ICommand);

        /** Command type. */
        public type: wca_chat.Command.CommandType;

        /** Command targetId. */
        public targetId: string;

        /**
         * Creates a new Command instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Command instance
         */
        public static create(properties?: wca_chat.ICommand): wca_chat.Command;

        /**
         * Encodes the specified Command message. Does not implicitly {@link wca_chat.Command.verify|verify} messages.
         * @param message Command message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wca_chat.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Command message, length delimited. Does not implicitly {@link wca_chat.Command.verify|verify} messages.
         * @param message Command message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wca_chat.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Command message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wca_chat.Command;

        /**
         * Decodes a Command message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wca_chat.Command;

        /**
         * Verifies a Command message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Command message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Command
         */
        public static fromObject(object: { [k: string]: any }): wca_chat.Command;

        /**
         * Creates a plain object from a Command message. Also converts values to other types if specified.
         * @param message Command
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wca_chat.Command, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Command to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Command
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace Command {

        /** CommandType enum. */
        enum CommandType {
            SUBSCRIBE_GROUP = 0,
            UNSUBSCRIBE_GROUP = 1
        }
    }

    /** Properties of a ProtocolWrapper. */
    interface IProtocolWrapper {

        /** ProtocolWrapper chatMessage */
        chatMessage?: (wca_chat.IChatMessage|null);

        /** ProtocolWrapper presence */
        presence?: (wca_chat.IPresence|null);

        /** ProtocolWrapper command */
        command?: (wca_chat.ICommand|null);
    }

    /** Represents a ProtocolWrapper. */
    class ProtocolWrapper implements IProtocolWrapper {

        /**
         * Constructs a new ProtocolWrapper.
         * @param [properties] Properties to set
         */
        constructor(properties?: wca_chat.IProtocolWrapper);

        /** ProtocolWrapper chatMessage. */
        public chatMessage?: (wca_chat.IChatMessage|null);

        /** ProtocolWrapper presence. */
        public presence?: (wca_chat.IPresence|null);

        /** ProtocolWrapper command. */
        public command?: (wca_chat.ICommand|null);

        /** ProtocolWrapper content. */
        public content?: ("chatMessage"|"presence"|"command");

        /**
         * Creates a new ProtocolWrapper instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProtocolWrapper instance
         */
        public static create(properties?: wca_chat.IProtocolWrapper): wca_chat.ProtocolWrapper;

        /**
         * Encodes the specified ProtocolWrapper message. Does not implicitly {@link wca_chat.ProtocolWrapper.verify|verify} messages.
         * @param message ProtocolWrapper message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: wca_chat.IProtocolWrapper, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProtocolWrapper message, length delimited. Does not implicitly {@link wca_chat.ProtocolWrapper.verify|verify} messages.
         * @param message ProtocolWrapper message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: wca_chat.IProtocolWrapper, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProtocolWrapper message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ProtocolWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): wca_chat.ProtocolWrapper;

        /**
         * Decodes a ProtocolWrapper message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ProtocolWrapper
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): wca_chat.ProtocolWrapper;

        /**
         * Verifies a ProtocolWrapper message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProtocolWrapper message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProtocolWrapper
         */
        public static fromObject(object: { [k: string]: any }): wca_chat.ProtocolWrapper;

        /**
         * Creates a plain object from a ProtocolWrapper message. Also converts values to other types if specified.
         * @param message ProtocolWrapper
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: wca_chat.ProtocolWrapper, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProtocolWrapper to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ProtocolWrapper
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
