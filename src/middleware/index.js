const request = require('request-promise')
module.exports = (container) => {
    const {
        httpCode,
        serverHelper,
        serverSettings
    } = container.resolve('config')
    const logger = container.resolve('logger')
    const arrIgnore = ['/login', '/refreshToken']
    const verifyAccessToken = async (req, res, next) => {
        try {
            const token = req.headers['x-access-token'] || ''
            if (!token) {
                return res.status(httpCode.BAD_REQUEST).json({msg: 'Bạn không có quyền thực hiện tác vụ này.'})
            }
            const user = await serverHelper.verifyToken(token)
            const {path} = req

            const option = {
                uri: 'http://localhost:8009/authorization',
                json: {
                    userId: user._id,
                    path,
                    method: req.method
                },
                headers: {
                    'x-access-token': token
                },
                method: 'POST'
            }
            const {
                ok,
                msg,
                user: userAuthorization
            } = await request(option)
            if (ok) {
                req.user = userAuthorization
                return next()
            }
            res.status(httpCode.BAD_REQUEST).json({msg: msg || 'Bạn không có quyền thực hiện tác vụ này.'})
        } catch (e) {
            if (!e.message.includes('TokenExpiredError')) {
                logger.e(e)
            }
            res.status(httpCode.TOKEN_EXPIRED).json({})
        }
    }
    const checkAdmin = async (req, res, next) => {
        try {
            const token = req.headers['x-access-token'] || ''
            if (token) {
                const user = await serverHelper.verifyToken(token)
                if (user && user.isAdministrator) {
                    req.user = user
                    return next()
                }
                return res.status(httpCode.BAD_REQUEST).json('Bạn không có quyền thực hiện tác vụ này!')
            }
            res.status(httpCode.BAD_REQUEST).json('Bạn không có quyền thực hiện tác vụ này.')
        } catch (e) {
            res.status(httpCode.TOKEN_EXPIRED).json({})
        }
    }
    const checkAccessToken = (req, res, next) => {
        const token = req.headers['x-access-token']
        const user = serverHelper.isValidToken(token)
        if (user) {
            req.user = user
            return next()
        } else {
            for (const i of arrIgnore) {
                if (req.path.includes(i)) {
                    return next()
                }
            }
            return res.status(httpCode.TOKEN_EXPIRED).json({})
        }
    }
    return {
        verifyAccessToken,
        checkAccessToken,
        checkAdmin
    }
}
