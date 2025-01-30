import { DataTypes } from "sequelize";
import dbUnikasRecon from "../../config/dbUnikasBilling.js"; // Import konfigurasi database Anda
import { TransactionParkingIntegration } from "../Unikas_Integration/TransactionParkingIntegration.js";

export const TransactionParkingRecon = dbUnikasRecon.define(
  "TransactionParkingRecon",
  {
    Id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    TransactionNo: {
      type: DataTypes.STRING(30),
    },
    ReferenceNo: {
      type: DataTypes.STRING(30),
    },
    LocationCode: {
      type: DataTypes.STRING(20),
    },
    SubLocationCode: {
      type: DataTypes.STRING(20),
    },
    GateInCode: {
      type: DataTypes.STRING(20),
    },
    VehicleType: {
      type: DataTypes.STRING(20),
    },
    ProductName: {
      type: DataTypes.STRING(50),
    },
    InTime: {
      type: DataTypes.DATE,
    },
    Duration: {
      type: DataTypes.INTEGER,
    },
    Tariff: {
      type: DataTypes.DOUBLE,
    },
    GracePeriod: {
      type: DataTypes.INTEGER,
    },
    PaymentStatus: {
      type: DataTypes.STRING(10),
    },
    PaymentReferenceNo: {
      type: DataTypes.STRING(50),
    },
    PaymentDate: {
      type: DataTypes.DATE,
    },
    IssuerID: {
      type: DataTypes.STRING(20),
    },
    RetrievalReferenceNo: {
      type: DataTypes.STRING(50),
    },
    ReferenceTransactionNo: {
      type: DataTypes.STRING(100),
    },
    ApprovalCode: {
      type: DataTypes.STRING(10),
    },
    OutTime: {
      type: DataTypes.DATE,
    },
    GateOutCode: {
      type: DataTypes.STRING(20),
    },
    InsertedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    FileName: {
      type: DataTypes.STRING(50),
    },
    TransactionReference: {
      type: DataTypes.STRING(150),
    },
    CreatedOn: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    CreatedBy: {
      type: DataTypes.STRING(50),
    },
    UpdatedOn: {
      type: DataTypes.DATE,
    },
    UpdatedBy: {
      type: DataTypes.STRING(100),
    },
    MatchRecon: {
      type: DataTypes.INTEGER(2),
    },
    MatchPaymentRecon: {
      type: DataTypes.INTEGER(2),
    },
    Penalty: {
      type: DataTypes.INTEGER(255),
    },
  },
  {
    timestamps: false, // Jika tabel tidak menggunakan kolom created_at & updated_at default
    tableName: "TransactionParkingRecon", // Sesuaikan nama tabel jika berbeda
  }
);

TransactionParkingRecon.belongsTo(TransactionParkingIntegration, {
  foreignKey: "TransactionNo",
});
TransactionParkingIntegration.hasOne(TransactionParkingRecon, {
  foreignKey: "TransactionNo",
});

export default TransactionParkingRecon;
