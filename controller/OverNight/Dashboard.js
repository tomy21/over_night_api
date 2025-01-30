import { Op, Sequelize } from "sequelize";
import { TransactionOverNights } from "../../model/TransactionOverNights.js";
import moment_timezone from "moment-timezone";
import { Location } from "../../model/RefLocation.js";

export const valueStatus = async (req, res) => {
  const today = moment_timezone().tz("Asia/Bangkok").format("YYYY-MM-DD");
  const date = req.query.date || today;

  try {
    const transaksiPOST = await TransactionOverNights.count({
      where: {
        TransactionNo: { [Op.not]: null },
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });
    // console.log(transaksiPOST);
    const totalChecklist = await TransactionOverNights.count({
      where: {
        UploadedAt: { [Op.not]: null },
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });
    const totalInap = await TransactionOverNights.count({
      where: {
        Status: "Inap",
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });
    const totalLostTicket = await TransactionOverNights.count({
      where: {
        Status: "Lost Ticket",
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });
    const totalIT = await TransactionOverNights.count({
      where: {
        Status: "IT",
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });
    const totalTidakTeridentifikasi = await TransactionOverNights.count({
      where: {
        Status: "Tidak Teridentifikasi",
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });
    const totalLainLain = await TransactionOverNights.count({
      where: {
        Status: "Lain-lain",
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Get Data Successfully",
      data: {
        transaksiPOST,
        totalChecklist,
        totalInap,
        totalLostTicket,
        totalIT,
        totalTidakTeridentifikasi,
        totalLainLain,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const topTransaction = async (req, res) => {
  const today = moment_timezone().tz("Asia/Bangkok").format("YYYY-MM-DD");
  const date = req.query.date || today;

  try {
    // Query untuk mendapatkan lokasi dengan jumlah transaksi terbanyak
    const topLocations = await TransactionOverNights.findAll({
      attributes: [
        "LocationCode",
        [
          TransactionOverNights.sequelize.fn(
            "COUNT",
            TransactionOverNights.sequelize.col("LocationCode")
          ),
          "total",
        ],
      ],
      where: {
        Status: { [Op.notIn]: ["Inap", "In AREA"] }, // Exclude status "Inap" dan "In AREA"
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
      include: [
        {
          model: Location,
          as: "RefLocation",
          attributes: ["Code", "Name", "Vendor"], // Ambil nama lokasi
        },
      ],
      group: ["LocationCode", "RefLocation.Code", "RefLocation.Name"], // Group by lokasi
      order: [[TransactionOverNights.sequelize.literal("total"), "DESC"]], // Urutkan berdasarkan jumlah transaksi tertinggi
      limit: 10, // Ambil 10 lokasi teratas
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Top Locations Retrieved Successfully",
      data: topLocations,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const topTransactionStatus = async (req, res) => {
  const today = moment_timezone().tz("Asia/Bangkok").format("YYYY-MM-DD");
  const date = req.query.date || today; // Ambil tanggal dari query, jika tidak ada gunakan tanggal hari ini

  try {
    // Query untuk mendapatkan Top 5 Status dan Remarks
    const topStatuses = await TransactionOverNights.findAll({
      attributes: [
        "Status",
        "Remarks",
        [Sequelize.fn("COUNT", Sequelize.col("Status")), "total"],
      ],
      where: {
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
      group: ["Status", "Remarks"], // Grouping berdasarkan Status dan Remarks
      order: [[Sequelize.literal("total"), "DESC"]], // Urutkan dari yang terbanyak
      limit: 5, // Ambil 5 data teratas
    });

    return res.status(200).json({
      statusCode: 200,
      message: "Top 5 Status & Remarks Retrieved Successfully",
      data: topStatuses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getStatusTotalByMonth = async (req, res) => {
  const { month } = req.query; // Format: YYYY-MM

  if (!month) {
    return res.status(400).json({
      statusCode: 400,
      message: "Bulan diperlukan (format: YYYY-MM)",
    });
  }

  try {
    const transactionStats = await TransactionOverNights.findAll({
      attributes: [
        [Sequelize.fn("DATE", Sequelize.col("CreatedAt")), "date"], // Ambil hanya tanggal
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              `CASE WHEN Status IN ('Inap', 'In Area') THEN 1 ELSE 0 END`
            )
          ),
          "inap",
        ], // Hitung jumlah 'Inap' atau 'In Area'
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              `CASE WHEN Status NOT IN ('Inap', 'In Area') THEN 1 ELSE 0 END`
            )
          ),
          "overNight",
        ], // Hitung jumlah selain 'Inap' atau 'In Area'
      ],
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("DATE_FORMAT", Sequelize.col("CreatedAt"), "%Y-%m"),
            month
          ),
        ],
      },
      group: [Sequelize.fn("DATE", Sequelize.col("CreatedAt"))], // Kelompokkan berdasarkan tanggal
      order: [[Sequelize.fn("DATE", Sequelize.col("CreatedAt")), "ASC"]], // Urutkan berdasarkan tanggal
    });

    return res.status(200).json({
      statusCode: 200,
      message: `Total transaksi untuk bulan ${month} berhasil diambil`,
      data: transactionStats, // Menampilkan array transaksi per tanggal
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getStatusPercentageByDate = async (req, res) => {
  const today = moment_timezone().tz("Asia/Bangkok").format("YYYY-MM-DD");
  const date = req.query.date || today; // Jika tidak ada tanggal, gunakan hari ini

  if (!date) {
    return res.status(400).json({
      statusCode: 400,
      message: "Tanggal diperlukan",
    });
  }

  try {
    // Total transaksi keseluruhan pada tanggal tertentu
    const totalTransactions = await TransactionOverNights.count({
      where: Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
        date
      ),
    });

    if (totalTransactions === 0) {
      return res.status(200).json({
        statusCode: 200,
        message: `Tidak ada transaksi pada tanggal ${date}`,
        data: {
          totalTransactions: 0,
          statuses: [],
        },
      });
    }

    // Hitung jumlah transaksi berdasarkan status (kecuali "Inap" dan "In Area")
    const statusCounts = await TransactionOverNights.findAll({
      attributes: [
        "Status",
        [Sequelize.fn("COUNT", Sequelize.col("Status")), "count"],
      ],
      where: {
        Status: { [Op.notIn]: ["Inap", "In Area"] },
        CreatedAt: Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("CreatedAt")),
          date
        ),
      },
      group: ["Status"], // Kelompokkan berdasarkan Status
    });

    // Ubah hasil ke dalam format JSON dengan persentase
    const statuses = statusCounts.map((item) => {
      const count = parseInt(item.dataValues.count, 10);
      const percentage = ((count / totalTransactions) * 100).toFixed(2); // Persentase dengan 2 desimal
      return {
        status: item.Status,
        count,
        percentage: `${percentage}%`,
      };
    });

    return res.status(200).json({
      statusCode: 200,
      message: `Persentase status untuk tanggal ${date} berhasil dihitung`,
      data: {
        totalTransactions,
        statuses,
      },
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
