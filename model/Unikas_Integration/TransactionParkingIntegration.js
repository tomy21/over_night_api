import { DataTypes } from "sequelize";
import dbUnikas from "../../config/dbUnikas.js";

export const TransactionParkingIntegration = dbUnikas.define(
  "TransactionParkingIntegration",
  {
    Id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    TrxRefId: {
      type: DataTypes.INTEGER,
    },
    TransactionNo: {
      type: DataTypes.STRING(50),
    },
    ReferenceNo: {
      type: DataTypes.STRING(50),
    },
    LicensePlateIn: {
      type: DataTypes.STRING(50),
    },
    LocationCode: {
      type: DataTypes.STRING(50),
    },
    SubLocationCode: {
      type: DataTypes.STRING(50),
    },
    InTime: {
      type: DataTypes.DATE,
    },
    GateInCode: {
      type: DataTypes.STRING(50),
    },
    VehicleType: {
      type: DataTypes.STRING(50),
    },
    ProductName: {
      type: DataTypes.STRING(100),
    },
    GracePeriodIn: {
      type: DataTypes.INTEGER,
    },
    QRTicket: {
      type: DataTypes.STRING(200),
    },
    Duration: {
      type: DataTypes.INTEGER,
    },
    TariffAmount: {
      type: DataTypes.DECIMAL(10, 2),
    },
    VoucherAmount: {
      type: DataTypes.DECIMAL(10, 2),
    },
    PaymentAmount: {
      type: DataTypes.DECIMAL(10, 2),
    },
    PaymentStatus: {
      type: DataTypes.STRING(50),
    },
    PaymentDate: {
      type: DataTypes.DATE,
    },
    PaymentMethod: {
      type: DataTypes.STRING(50),
    },
    IssuerID: {
      type: DataTypes.STRING(50),
    },
    PaymentReferenceNo: {
      type: DataTypes.STRING(100),
    },
    RetrievalReferenceNo: {
      type: DataTypes.STRING(100),
    },
    PrepaidCardName: {
      type: DataTypes.STRING(50),
    },
    PrepaidCardNo: {
      type: DataTypes.STRING(50),
    },
    PrepaidCardMID: {
      type: DataTypes.STRING(50),
    },
    PrepaidCardTID: {
      type: DataTypes.STRING(50),
    },
    PrepaidCardInitialBalance: {
      type: DataTypes.DECIMAL(10, 2),
    },
    PrepaidCardRemainingBalance: {
      type: DataTypes.DECIMAL(10, 2),
    },
    ReferenceTransactionNo: {
      type: DataTypes.STRING(50),
    },
    GracePeriodPayment: {
      type: DataTypes.INTEGER,
    },
    LicensePlateOut: {
      type: DataTypes.STRING(50),
    },
    OutTime: {
      type: DataTypes.DATE,
    },
    GateOutCode: {
      type: DataTypes.STRING(50),
    },
    MerchantDataRequestIN: {
      type: DataTypes.TEXT,
    },
    MerchantDataResponseIN: {
      type: DataTypes.TEXT,
    },
    POSTDataRequestIN: {
      type: DataTypes.TEXT,
    },
    POSTDataResponseIN: {
      type: DataTypes.TEXT,
    },
    MerchantDataRequestPAY: {
      type: DataTypes.TEXT,
    },
    MerchantDataResponsePAY: {
      type: DataTypes.TEXT,
    },
    POSTDataRequestPAY: {
      type: DataTypes.TEXT,
    },
    POSTDataResponsePAY: {
      type: DataTypes.TEXT,
    },
    MerchantDataRequestOUT: {
      type: DataTypes.TEXT,
    },
    MerchantDataResponseOUT: {
      type: DataTypes.TEXT,
    },
    POSTDataRequestOUT: {
      type: DataTypes.TEXT,
    },
    POSTDataResponseOUT: {
      type: DataTypes.TEXT,
    },
    RecordStatus: {
      type: DataTypes.INTEGER,
    },
    CreatedBy: {
      type: DataTypes.STRING(50),
    },
    CreatedOn: {
      type: DataTypes.DATE,
    },
    UpdatedBy: {
      type: DataTypes.STRING(50),
    },
    UpdatedOn: {
      type: DataTypes.DATE,
    },
  },
  { timestamps: false, tableName: "TransactionParkingIntegration" }
);
