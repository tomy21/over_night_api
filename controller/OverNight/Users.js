import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import generateUserCode from "../../config/Function.js";
import { Op } from "sequelize";
import { Users } from "../../model/Users.js";
import { UsersLocations } from "../../model/UsersLocation.js";
import { errorResponse, successResponse } from "../../config/response.js";
import { Location } from "../../model/RefLocation.js";
import { UsersToken } from "../../model/UsersToken.js";

const signToken = (user) => {
  return jwt.sign(
    {
      Id: user.Id,
      email: user.Email,
      iat: Math.floor(Date.now() / 1000),
      iss: "https://skyparking.online",
      role: user.SetupRoleId,
      sub: user.Username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user);

  res.cookie("refreshToken", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    sameSite: "None",
  });

  res.status(statusCode).json({
    status: "success",
    token,
    message: "Login berhasil",
  });
};

export const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const { count, rows } = await Users.findAndCountAll({
      offset: (page - 1) * limit,
      limit: limit,
      attributes: ["Id", "Name", "Email", "Username", "Password"],
      order: [["UpdatedOn", "DESC"]],
    });

    return successResponse(res, 200, "Get Data successfully", {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      transaction: rows,
    });
  } catch (error) {
    return errorResponse(res, 500, "Error", error);
  }
};

export const getUsersById = async (req, res) => {
  try {
    const users = await Users.findByPk(req.userId, {
      attributes: ["Id", "Name", "Email", "Username"],
    });
    const usersLocation = await UsersLocations.findOne({
      where: {
        UserId: req.userId,
      },
      attributes: ["LocationCode"],
    });

    const response = {
      statusCode: 200,
      message: "Get Data Successfuly",
      data: {
        user: users,
        location: usersLocation,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ msg: "Terjadi kesalahan saat mengambil data pengguna" });
  }
};

export const getById = async (req, res) => {
  try {
    const users = await Users.findByPk(req.params.id, {
      attributes: [
        "Id",
        "Name",
        "Email",
        "Username",
        "Phone",
        "Gender",
        "SetupRoleId",
      ],
    });
    const usersLocation = await UsersLocations.findAll({
      where: {
        UserId: req.params.id,
      },
      include: [
        {
          model: Location,
          attributes: ["Code", "Name"],
          as: "RefLocation",
        },
      ],
      attributes: ["LocationCode"],
    });

    const response = {
      statusCode: 200,
      message: "Get Data Successfuly",
      data: {
        user: users,
        location: usersLocation,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ msg: "Terjadi kesalahan saat mengambil data pengguna" });
  }
};

export const getUserByLocation = async (req, res) => {
  try {
    const role = req.role; // Role diambil dari middleware authenticate
    const userId = req.userId; // UserId diambil dari middleware authenticate

    const page = parseInt(req.query.page, 10) || 1; // Halaman saat ini (default: 1)
    const limit = parseInt(req.query.limit, 10) || 10; // Jumlah data per halaman (default: 10)
    const offset = (page - 1) * limit; // Data yang dilewati berdasarkan halaman

    // Ambil data user yang sedang login
    const currentUser = await Users.findOne({
      where: { Id: userId },
      attributes: ["Id", "Name", "Email"],
    });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role !== 15 && role !== 9 && role !== 1) {
      return res
        .status(403)
        .json({ message: "You do not have permission to access this data." });
    }

    const userLocations = await UsersLocations.findAll({
      where: { UserId: userId },
      attributes: ["LocationCode"],
    });

    const locationCodes = userLocations.map((loc) => loc.LocationCode);

    if (locationCodes.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No locations found for the current user.",
      });
    }

    const matchingUserLocations = await UsersLocations.findAll({
      where: {
        LocationCode: { [Op.in]: locationCodes },
      },
      attributes: ["UserId"],
      group: ["UserId"], // Pastikan hanya mengambil userId unik
    });

    const matchingUserIds = matchingUserLocations.map((loc) => loc.UserId);

    if (matchingUserIds.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "No users found with matching locations.",
      });
    }

    const { count, rows } = await Users.findAndCountAll({
      where: { Id: { [Op.in]: matchingUserIds }, SetupRoleId: 14 },
      attributes: [
        "Id",
        "Name",
        "Email",
        "Username",
        "SetupRoleId",
        "UserStatus",
        "UserCode",
        "LastActivity",
      ],
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

    // Formatkan response
    const response = {
      statusCode: 200,
      message: "Get Data Successfully",
      data: rows.map((user) => ({
        userId: user.Id,
        name: user.Name,
        email: user.Email,
        username: user.Username,
        userStatus: user.UserStatus,
        setupRoleId: user.SetupRoleId,
        userCode: user.UserCode,
        lastActivity: user.LastActivity,
        location: user.UsersLocations.map((loc) => ({
          locationCode: loc.LocationCode,
          refLocation: loc.RefLocation,
        })),
      })),
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        perPage: limit,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: "Terjadi kesalahan saat mengambil data",
      error: error.message,
    });
  }
};

export const getLocation = async (req, res) => {
  const userId = req.userId;
  const roleId = req.role;

  try {
    let userLocations = [];

    // Logika filter berdasarkan roleId
    if (roleId === 15) {
      // Role 15: Tampilkan lokasi sesuai dengan userId
      userLocations = await UsersLocations.findAll({
        where: { UserId: userId },
        attributes: ["LocationCode"],
        include: [
          {
            model: Location,
            attributes: ["Code", "Name"],
            as: "RefLocation",
          },
        ],
      });
    } else if (roleId === 9 || roleId === 1) {
      // Role 9 atau 1: Tampilkan semua lokasi
      userLocations = await Location.findAll({
        attributes: ["Code", "Name"],
      });
    }

    // Role 14 tidak mengembalikan data lokasi
    if (roleId === 14) {
      return res.json({
        statusCode: 200,
        message: "No locations available for this role.",
        data: { location: [] },
      });
    }

    // Formatkan response untuk roleId 15, 9, atau 1
    const response = {
      statusCode: 200,
      message: "Get Data Successfully",
      data: {
        location:
          roleId === 15
            ? userLocations.map((loc) => ({
                locationCode: loc.LocationCode,
                refLocation: loc.RefLocation,
              }))
            : userLocations.map((loc) => ({
                locationCode: loc.Code,
                refLocation: { Code: loc.Code, Name: loc.Name },
              })),
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: "An error occurred while retrieving locations.",
      error: error.message,
    });
  }
};

export const loginDetail = async (req, res) => {
  try {
    const users = await Users.findByPk(req.userId, {
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

    const response = {
      statusCode: 200,
      message: "Get Data Successfuly",
      data: {
        user: users,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ msg: "Terjadi kesalahan saat mengambil data pengguna" });
  }
};

export const register = async (req, res) => {
  const {
    SetupRoleId,
    IpAddress,
    Name,
    Gender,
    Birthdate,
    Username,
    Email,
    Phone,
    HandPhone,
    Whatsapp,
    Photo,
    IsFirstpassword,
    FlagAllLocation,
    MerchantId,
    LocationCode, // array of location codes
    CreatedBy,
  } = req.body;
  const password = "sky123";
  try {
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);

    const currentDate = new Date();
    const oneYearLater = new Date(
      currentDate.getFullYear() + 1,
      currentDate.getMonth(),
      currentDate.getDate()
    );

    const lastUsers = await Users.findOne({
      order: [["Id", "DESC"]],
    });

    const lastId = lastUsers ? lastUsers.Id : 0;
    const userCode = await generateUserCode(lastId);
    const newUser = await Users.create({
      SetupRoleId: SetupRoleId,
      IpAddress: IpAddress,
      Name: Name,
      UserCode: userCode,
      Gender: Gender,
      Birthdate: Birthdate,
      Username: Username,
      Email: Email,
      Password: hashPassword,
      Phone: Phone,
      HandPhone: HandPhone,
      Whatsapp: Whatsapp,
      Photo: Photo,
      PasswordExpired: oneYearLater,
      IsFirstpassword: IsFirstpassword,
      FlagAllLocation: FlagAllLocation,
      MerchantId: MerchantId,
      CreatedBy: CreatedBy,
    });

    if (!Array.isArray(LocationCode)) {
      return res.status(400).json({ msg: "LocationCode harus berupa array" });
    }

    const data = LocationCode.map((location) => ({
      UserId: newUser.Id,
      LocationCode: location,
      CreatedBy: CreatedBy, // use the CreatedBy from req.body
    }));

    await UsersLocations.bulkCreate(data);

    res.json({ statusCode: 200, msg: "Register berhasil" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ msg: "Terjadi kesalahan saat registrasi" });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: "fail",
        message:
          "Harap masukkan identifier (username, email, atau nomor telepon) dan password!",
      });
    }

    const user = await Users.findOne({
      where: {
        [Op.or]: [
          { Username: identifier },
          { Email: identifier },
          { Phone: identifier },
        ],
      },
    });

    if (!user || !(await bcrypt.compare(password, user.Password))) {
      return res.status(401).json({
        status: "fail",
        message: "Identifier atau password tidak sesuai",
      });
    }

    user.LastLogin = new Date();
    await user.save({ validate: false });

    createSendToken(user, 200, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ msg: "Terjadi kesalahan saat login" });
  }
};

export const logout = async (req, res) => {
  res.cookie("refreshToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};
