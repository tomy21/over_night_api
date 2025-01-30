import { errorResponse, successResponse } from "../../config/response.js";
import { TransactionOverNights } from "../../model/TransactionOverNights.js";
import { UsersLocations } from "../../model/UsersLocation.js";
import moment from "moment";
import moment_timezone from "moment-timezone";
import fs from "fs/promises";
import { TransactionOverNightOficcers } from "../../model/TransactionOverNightOficcers.js";
import { Op, Sequelize, Transaction } from "sequelize";
import { Location } from "../../model/RefLocation.js";
import { Users } from "../../model/Users.js";
import path from "path";
import { TransactionParkingIntegration } from "../../model/Unikas_Integration/TransactionParkingIntegration.js";
import TransactionParkingRecon from "../../model/UnikasBillingRecon/TransactionParkingRecon.js";
import ExcelJs from "exceljs";

export const getDataOvernightAll = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const { count, rows } = await TransactionOverNights.findAndCountAll({
      offset: (page - 1) * limit,
      limit: limit,
      attributes: [
        "Id",
        "TransactionNo",
        "ReferenceNo",
        "PlatePOST",
        "LocationCode",
        "VehiclePlateNo",
        "TypeVehicle",
        "Plateregognizer",
        "Status",
      ],
      order: [["ModifiedOn", "DESC"]],
    });

    return successResponse(res, 200, "Get Data Transaction successfully", {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      transaction: rows,
    });
  } catch (error) {
    return errorResponse(res, 500, "Error", error);
  }
};

export const getDataOverNightUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startDate = req.query.startDate || new Date();
  const orderBy = req.query.orderBy || "ModifiedOn";
  const sortBy = req.query.sortBy || "DESC";
  const keyword = req.query.keyword || "";

  const locationCode = req.query.location || "";
  const id = req.userId;

  try {
    const queries = {
      where: locationCode ? { LocationCode: locationCode } : {},
      offset: (page - 1) * limit,
      limit,
      include: [
        {
          model: Location,
          attributes: ["Name"],
        },
      ],
    };

    if (keyword) {
      queries.where = {
        ...queries.where,
        [Op.or]: [
          { TransactionNo: { [Op.like]: `%${keyword}%` } },
          { ReferenceNo: { [Op.like]: `%${keyword}%` } },
          { VehiclePlateNo: { [Op.like]: `%${keyword}%` } },
          { Status: { [Op.like]: `%${keyword}%` } },
          { InTime: { [Op.like]: `%${keyword}%` } },
        ],
      };
    }

    if (startDate) {
      if (!moment(startDate, "YYYY-MM-DD", true).isValid()) {
        return errorResponse(res, 400, "Invalid date format. Use YYYY-MM-DD");
      }
      queries.where = {
        ...queries.where,
        [Op.and]: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          startDate
        ),
      };
    }

    const userLocation = await UsersLocations.findAll({
      where: { UserId: id },
      attributes: ["LocationCode"],
    });

    if (!userLocation || userLocation.length === 0) {
      return errorResponse(res, 404, "No locations found for this user");
    }

    const locationCodes = userLocation.map((location) => location.LocationCode);

    if (orderBy && sortBy) {
      queries.order = [[orderBy, sortBy.toUpperCase()]];
    }

    const { count, rows } = await TransactionOverNights.findAndCountAll({
      ...queries,
      attributes: [
        "Id",
        "TransactionNo",
        "ReferenceNo",
        "LocationCode",
        "VehiclePlateNo",
        "PlatePOST",
        "TypeVehicle",
        "InTime",
        "Plateregognizer",
        "ModifiedBy",
        "UploadedAt",
        "Status",
        "Remarks",
        "CreatedAt",
        "ModifiedOn",
      ],
      where: {
        ...queries.where,
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
      },
      order: queries.order || [["ModifiedOn", "DESC"]],
    });

    const TransactionCount = await TransactionOverNights.count({
      where: {
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
        [Op.and]: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          startDate
        ),
      },
    });

    const statusCounts = await TransactionOverNights.findAll({
      where: {
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
        [Op.and]: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          startDate
        ),
      },
      attributes: [
        "Status",
        [Sequelize.fn("COUNT", Sequelize.col("Status")), "count"],
      ],
      group: ["Status"],
      raw: true,
    });

    const totalTransactionChecklist = await TransactionOverNights.count({
      where: {
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
        [Op.and]: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          startDate
        ),
        UploadedAt: {
          [Op.ne]: null,
        },
      },
    });

    return successResponse(res, 200, "Get Data successfully", {
      total: TransactionCount,
      totalPages: Math.ceil(count / limit),
      totalChecklist: totalTransactionChecklist,
      currentPage: parseInt(page),
      statusCounts: statusCounts,
      transaction: rows,
    });
  } catch (error) {
    console.error(
      "Error in getDataOverNightUsers:",
      error.message,
      error.stack
    );
    return errorResponse(res, 500, "Error", error.message);
  }
};

export const getDataOverNightUsersOfficer = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const id = req.userId;

    const userLocation = await UsersLocations.findAll({
      where: { UserId: id },
      attributes: ["LocationCode"],
    });

    if (!userLocation || userLocation.length === 0) {
      return errorResponse(res, 404, "No locations found for this user");
    }

    const locationCodes = userLocation.map((location) => location.LocationCode);

    const startOfDay = moment.tz("Asia/Jakarta").startOf("day").toDate();
    const endOfDay = moment.tz("Asia/Jakarta").endOf("day").toDate();

    const totalMobil = await TransactionOverNightOficcers.count({
      where: {
        TypeVehicle: "MOBIL",
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
        ModifiedOn: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });
    const totalMotor = await TransactionOverNightOficcers.count({
      where: {
        TypeVehicle: "MOTOR",
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
        ModifiedOn: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    const { count, rows } = await TransactionOverNightOficcers.findAndCountAll({
      offset: (page - 1) * limit,
      limit: limit,
      attributes: [
        "Id",
        "LocationCode",
        "VehiclePlateNo",
        "TypeVehicle",
        "ModifiedBy",
        "Status",
        "CreatedAt",
        "ModifiedOn",
      ],
      include: [
        {
          model: Location,
          attributes: ["Code", "Name"],
        },
      ],
      where: {
        LocationCode:
          locationCodes.length > 1
            ? { [Op.in]: locationCodes }
            : locationCodes[0],
        ModifiedOn: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      order: [["ModifiedOn", "DESC"]],
    });

    return successResponse(res, 200, "Get Data successfully", {
      total: count,
      totalMobil: totalMobil,
      totalMotor: totalMotor,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      transaction: rows,
    });
  } catch (error) {
    console.error("Error:", error); // Log error
    return errorResponse(res, 500, "Error", error.message);
  }
};

export const validationData = async (req, res) => {
  try {
    const id = req.userId;

    const User = await Users.findOne({
      where: { Id: id },
      attributes: ["Username"],
    });

    if (!User) {
      return res
        .status(404)
        .json({ message: "No locations found for this user" });
    }

    const officer = User.Username;
    const { plateNo, platerecognizer, locationCode, typeVehicle, dateUpload } =
      req.body;
    const file = req.file;
    const currentTime = moment_timezone()
      .tz("Asia/Bangkok")
      .format("YYYY-MM-DD HH:mm:ss");

    if (!locationCode || !plateNo || !officer) {
      return res.status(400).json({ message: "Semua field harus diisi" });
    }

    if (!file) {
      return res.status(400).json({ message: "Gambar harus diunggah" });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedYesterday = yesterday.toISOString().split("T")[0];

    const data = await TransactionParkingIntegration.findOne({
      where: {
        LicensePlateIn: plateNo,
        LocationCode: locationCode,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("DATE", Sequelize.col("InTime")),
            formattedYesterday
          ),
        ],
        OutTime: {
          [Op.or]: [
            { [Op.eq]: "0000-00-00 00:00:00" }, // Kondisi untuk string "0000-00-00 00:00:00"
            { [Op.is]: null }, // Kondisi untuk nilai NULL
          ],
        },
      },
      order: [["InTime", "DESC"]],
    });

    // Periksa apakah TransactionNo sudah ada di database
    const existingTransaction = await TransactionOverNights.findOne({
      where: { TransactionNo: data ? data.TransactionNo : null },
    });

    if (existingTransaction) {
      // Jika TransactionNo sudah ada, lakukan update
      await TransactionOverNights.update(
        {
          Plateregognizer: platerecognizer,
          VehiclePlateNo: plateNo,
          Status: "Inap",
          ModifiedOn: dateUpload,
          ModifiedBy: officer,
          UploadedAt: dateUpload,
        },
        {
          where: { TransactionNo: data.TransactionNo },
        }
      );
    } else {
      // Jika TransactionNo tidak ada, lakukan insert
      await TransactionOverNights.create({
        TransactionNo: data ? data.TransactionNo : null,
        ReferenceNo: data ? data.ReferenceNo : null,
        InTime: data ? data.InTime : null,
        GateInCode: data ? data.GateInCode : null,
        LocationCode: locationCode,
        VehiclePlateNo: plateNo,
        Plateregognizer: platerecognizer,
        ModifiedBy: officer,
        TypeVehicle: typeVehicle,
        PathPhotoImage: `/uploads/${file.filename}`,
        Status: "Inap",
        PhotoImage: null,
        ModifiedOn: currentTime,
      });
    }

    // Tambahkan ke TransactionOverNightOficcers
    await TransactionOverNightOficcers.create({
      LocationCode: locationCode,
      Status: "Inap",
      ModifiedBy: officer,
      ModifiedOn: currentTime,
      VehiclePlateNo: plateNo,
      TypeVehicle: typeVehicle,
      PathPhotoImage: `/uploads/${file.filename}`,
      PhotoImage: null,
    });

    return res
      .status(200)
      .json({ message: "Data berhasil disimpan atau diperbarui" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan saat menyimpan data" });
  }
};

export const getByPlateNumberRealtime = async (req, res) => {
  try {
    const { plateNo, locationCode } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Kurangi 1 hari
    startDate.setHours(0, 0, 0, 0); // Atur ke awal hari H-1

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Kurangi 1 hari
    endDate.setHours(23, 59, 59, 999);

    const { count, rows } = await TransactionParkingIntegration.findAndCountAll(
      {
        where: {
          // LicensePlateIn: plateNo,
          LocationCode: locationCode,
          InTime: {
            [Op.between]: [startDate, endDate], // Filter berdasarkan tanggal saja
          },
          OutTime: {
            [Op.is]: null, // Menggunakan Op.is untuk memeriksa nilai NULL
          },
        },
        order: [["InTime", "DESC"]],
        attributes: [
          "Id",
          "TransactionNo",
          "LicensePlateIn",
          "ReferenceNo",
          "LocationCode",
          "InTime",
          "GateInCode",
          "OutTime",
        ],
      }
    );

    return successResponse(res, 200, "Get Data successfully", data);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Error", error);
  }
};

export const getLocationByUser = async (req, res) => {
  try {
    const user = await Users.findOne({
      where: {
        Id: req.userId,
      },
      attributes: ["Id", "Name", "Email", "Username"],
      include: [
        {
          model: UsersLocations,
          attributes: ["LocationCode"],
          include: [
            {
              model: Location,
              attributes: ["Code", "Name"],
              as: "RefLocation",
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const saveToTransactionOverNights = async (req, res) => {
  try {
    const { locationCode } = req.query;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedYesterday = yesterday.toISOString().split("T")[0];

    // Step 1: Ambil data dari `TransactionParkingRecon`
    const reconData = await TransactionParkingRecon.findAll({
      where: {
        LocationCode: locationCode,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("DATE", Sequelize.col("InTime")),
            formattedYesterday
          ),
        ],
        OutTime: {
          [Op.or]: [
            { [Op.eq]: "0000-00-00 00:00:00" }, // Kondisi untuk string "0000-00-00 00:00:00"
            { [Op.is]: null }, // Kondisi untuk nilai NULL
          ],
        },
      },
      attributes: [
        "Id",
        "TransactionNo",
        "ReferenceNo",
        "LocationCode",
        "InTime",
        "GateInCode",
      ],
    });

    const transactionNos = reconData.map((data) => data.TransactionNo);

    // Step 2: Ambil data dari `TransactionParkingIntegration` berdasarkan TransactionNo
    const integrationData = await TransactionParkingIntegration.findAll({
      where: {
        TransactionNo: {
          [Op.in]: transactionNos,
        },
        OutTime: {
          [Op.or]: [
            { [Op.eq]: "0000-00-00 00:00:00" }, // Kondisi untuk string "0000-00-00 00:00:00"
            { [Op.is]: null }, // Kondisi untuk nilai NULL
          ],
        },
      },
      attributes: ["TransactionNo", "LicensePlateIn", "OutTime"],
    });

    const parkingData = reconData.map((recon) => {
      const integration = integrationData.find(
        (intData) => intData.TransactionNo === recon.TransactionNo
      );
      return {
        ...recon.toJSON(),
        LicensePlateIn: integration?.LicensePlateIn || null,
        OutTime: integration?.OutTime || null,
      };
    });

    if (parkingData.length === 0) {
      return successResponse(res, 200, "No data found to insert", []);
    }

    parkingData.forEach((data, index, array) => {
      const isDoubleTicket = array.some((otherData) => {
        // Skip self comparison
        if (data.TransactionNo === otherData.TransactionNo) return false;

        // Cek kondisi: GateInCode sama dan selisih InTime <= 10 detik
        return (
          data.GateInCode === otherData.GateInCode &&
          Math.abs(
            new Date(data.InTime).getTime() -
              new Date(otherData.InTime).getTime()
          ) <=
            5 * 1000 // Konversi 10 detik ke milidetik
        );
      });

      data.status = isDoubleTicket ? "Double Ticket" : "In Area"; // Tambahkan status
    });

    // Ambil semua TransactionNo yang sudah ada di `TransactionOverNights`
    const existingTransactionNos = await TransactionOverNights.findAll({
      where: {
        TransactionNo: {
          [Op.in]: parkingData.map((item) => item.TransactionNo),
        },
      },
      attributes: ["TransactionNo"],
    });

    const existingTransactionNosSet = new Set(
      existingTransactionNos.map((item) => item.TransactionNo)
    );

    // Filter data yang belum ada di `TransactionOverNights`
    const newTransactions = parkingData
      .filter((item) => !existingTransactionNosSet.has(item.TransactionNo))
      .map((item) => ({
        TransactionNo: item.TransactionNo,
        ReferenceNo: item.ReferenceNo,
        PlatePOST: item.LicensePlateIn,
        InTime: item.InTime,
        GateInCode: item.GateInCode,
        LocationCode: locationCode,
        Status: item.status,
      }));

    if (newTransactions.length === 0) {
      return successResponse(res, 200, "Data POST Already Inserted", []);
    }

    // Simpan transaksi baru ke `TransactionOverNights`
    await TransactionOverNights.bulkCreate(newTransactions);

    return successResponse(
      res,
      200,
      "Data successfully inserted",
      newTransactions
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Error while saving data", error);
  }
};

export const getDataRecon = async (req, res) => {
  try {
    const locationCode = req.query.locationCode;
    // Mendapatkan tanggal hari kemarin dalam format YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedYesterday = yesterday.toISOString().split("T")[0];

    // Step 1: Ambil data dari `TransactionParkingRecon`
    const reconData = await TransactionParkingRecon.findAll({
      where: {
        LocationCode: locationCode,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("DATE", Sequelize.col("InTime")),
            formattedYesterday
          ),
        ],
        OutTime: {
          [Op.or]: [
            { [Op.eq]: "0000-00-00 00:00:00" }, // Kondisi untuk string "0000-00-00 00:00:00"
            { [Op.is]: null }, // Kondisi untuk nilai NULL
          ],
        },
      },
      attributes: [
        "Id",
        "TransactionNo",
        "ReferenceNo",
        "LocationCode",
        "InTime",
        "GateInCode",
      ],
    });

    const reconCount = await TransactionParkingRecon.count({
      where: {
        LocationCode: locationCode,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("DATE", Sequelize.col("InTime")),
            formattedYesterday
          ),
        ],
        OutTime: {
          [Op.or]: [
            { [Op.eq]: "0000-00-00 00:00:00" }, // Kondisi untuk string "0000-00-00 00:00:00"
            { [Op.is]: null }, // Kondisi untuk nilai NULL
          ],
        },
      },
    });

    // Ambil semua TransactionNo dari reconData
    const transactionNos = reconData.map((data) => data.TransactionNo);

    // Step 2: Ambil data dari `TransactionParkingIntegration` berdasarkan TransactionNo
    const integrationData = await TransactionParkingIntegration.findAll({
      where: {
        TransactionNo: {
          [Op.in]: transactionNos,
        },
        OutTime: {
          [Op.or]: [
            { [Op.eq]: "0000-00-00 00:00:00" }, // Kondisi untuk string "0000-00-00 00:00:00"
            { [Op.is]: null }, // Kondisi untuk nilai NULL
          ],
        },
      },
      attributes: ["TransactionNo", "LicensePlateIn", "OutTime"],
    });

    // Step 3: Gabungkan data secara manual
    const mergedData = reconData.map((recon) => {
      const integration = integrationData.find(
        (intData) => intData.TransactionNo === recon.TransactionNo
      );
      return {
        ...recon.toJSON(),
        LicensePlateIn: integration?.LicensePlateIn || null,
        OutTime: integration?.OutTime || null,
      };
    });

    mergedData.forEach((data, index, array) => {
      const isDoubleTicket = array.some((otherData) => {
        // Skip self comparison
        if (data.TransactionNo === otherData.TransactionNo) return false;

        // Cek kondisi: GateInCode sama dan selisih InTime <= 5 detik
        return (
          data.GateInCode === otherData.GateInCode &&
          Math.abs(
            new Date(data.InTime).getTime() -
              new Date(otherData.InTime).getTime()
          ) <=
            5 * 1000 // Konversi 10 detik ke milidetik
        );
      });

      data.status = isDoubleTicket ? "Double Ticket" : "Valid"; // Tambahkan status
    });

    // data.isDoubleTicket = isDoubleTicket;

    return res.status(200).json({
      success: true,
      total: reconCount,
      data: mergedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching data",
    });
  }
};

export const updateStatus = async (req, res) => {
  const id = req.params.id;
  const category = req.body.category;
  const remarks = req.body.remarks;
  const idUser = req.userId;

  try {
    const transaction = await TransactionOverNights.findByPk(id);
    const user = await Users.findByPk(idUser);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    transaction.Status = category;
    transaction.Remarks = remarks;
    transaction.ModifiedBy = user.Username;
    await transaction.save();

    return res
      .status(200)
      .json({ statusCode: 200, message: "Status updated successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating status" });
  }
};

export const exportDataOverNight = async (req, res) => {
  const locationCodes = req.query.location
    ? JSON.parse(req.query.location)
    : [];
  const date = req.query.date || "";
  try {
    const whereClause = {};

    // Kondisi lokasi
    if (locationCodes.length > 0) {
      whereClause.LocationCode = { [Sequelize.Op.in]: locationCodes };
    }

    // Buat kondisi tanggal menggunakan rentang waktu
    const dateCondition = date
      ? {
          CreatedAt: {
            [Sequelize.Op.gte]: Sequelize.literal(`'${date} 00:00:00'`),
            [Sequelize.Op.lt]: Sequelize.literal(`'${date} 23:59:59'`),
          },
        }
      : null;
    // console.log(dateCondition);
    const result = await TransactionOverNights.findAndCountAll({
      where: {
        ...whereClause,
        ...(dateCondition ? dateCondition : {}),
      },
      include: [
        {
          model: Location,
          attributes: ["Name"],
        },
      ],
    });

    if (result) {
      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet("Transaction OverNight");

      worksheet.columns = [
        { header: "No", key: "No", width: 5 },
        { header: "Transaction No", width: 35, key: "TransactionNo" },
        { header: "Lokasi", width: 35, key: "LocationCode" },
        { header: "Plat Nomor", width: 15, key: "VehiclePlateNo" },
        { header: "Gambar", width: 30, key: "PathPhotoImage" },
        { header: "Type Kendaraan", width: 20, key: "TypeVehicle" },
        { header: "Status", width: 10, key: "Status" },
        { header: "Petugas", width: 50, key: "ModifiedBy" },
        { header: "Tanggal Foto", width: 20, key: "UploadedAt" },
        { header: "Tanggal Masuk", width: 20, key: "InTime" },
      ];

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      });

      for (const [index, value] of result.rows.entries()) {
        const row = worksheet.addRow({
          No: index + 1,
          LocationCode: value.RefLocation ? value.RefLocation.Name : "-",
          TransactionNo: value.TransactionNo || "-",
          VehiclePlateNo: value.VehiclePlateNo || "-",
          PathPhotoImage: "-",
          TypeVehicle: value.TypeVehicle || "-",
          Status: value.Status,
          ModifiedBy: value.ModifiedBy,
          UploadedAt: value.UploadedAt
            ? moment(value.UploadedAt)
                .tz("Asia/Jakarta")
                .format("YYYY-MM-DD HH:mm:ss")
            : "-",
          InTime: value.InTime
            ? moment(value.InTime)
                .tz("Asia/Jakarta")
                .format("YYYY-MM-DD HH:mm:ss")
            : "-",
        });

        if (value.PathPhotoImage) {
          const imagePath = path.join(
            process.cwd(),
            "uploads",
            path.basename(value.PathPhotoImage)
          );

          try {
            // Gunakan fs.access untuk memeriksa keberadaan file
            await fs.access(imagePath);

            const imageId = workbook.addImage({
              filename: imagePath,
              extension: "jpg",
            });

            worksheet.addImage(imageId, {
              tl: { col: 4, row: row.number - 1 },
              ext: { width: 100, height: 100 },
            });

            row.getCell("PathPhotoImage").value = "";
            worksheet.getRow(row.number).height = 80;
          } catch (err) {
            console.error("File does not exist:", imagePath);
            row.getCell("PathPhotoImage").value = "Gambar tidak tersedia";
          }
        } else {
          row.getCell("PathPhotoImage").value = "Gambar tidak tersedia";
        }

        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      const fileName =
        locationCodes.length > 0 && date ? `${date}.xlsx` : `alldate.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ success: false, message: "Get data failed" });
    }
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
